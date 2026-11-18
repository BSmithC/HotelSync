<?php

namespace App\Http\Controllers;

use App\Models\InventoryItem;
use App\Models\InventoryMovement;
use App\Services\InventoryService;
use App\Support\CurrentHotel;
use App\Support\Permission;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class InventoryController extends Controller
{
    /**
     * @var list<string>
     */
    private const STATES = ['activo', 'inactivo'];

    /**
     * @var list<string>
     */
    private const STOCK_STATES = ['bajo', 'agotado'];

    /**
     * @var list<string>
     */
    private const MOVEMENT_STATES = ['vigente', 'anulado', 'reverso'];

    /**
     * Inventory operations center: catalog, stock balances and the movement
     * ledger, scoped to the current hotel and period.
     */
    public function index(Request $request): Response
    {
        $this->authorize(Permission::InventoryView->value);

        $hotel = app(CurrentHotel::class)->model();
        $timezone = $hotel?->timezone ?? config('app.timezone');
        $currency = $hotel?->currency ?? 'DOP';

        [$from, $to] = $this->resolvePeriod($request, $timezone);

        $tab = (string) $request->input('tab', 'resumen');
        $tab = in_array($tab, ['resumen', 'articulos', 'movimientos'], true)
            ? $tab
            : 'resumen';

        $search = trim((string) $request->input('search', ''));
        $category = $this->filterValue($request, 'category', InventoryItem::CATEGORIES);
        $state = $this->filterValue($request, 'state', self::STATES);
        $stockState = $this->filterValue($request, 'stock_state', self::STOCK_STATES);
        $movementType = $this->filterValue($request, 'movement_type', InventoryMovement::TYPES);
        $movementState = $this->filterValue($request, 'movement_state', self::MOVEMENT_STATES);

        $items = $this->itemsQuery($search, $category, $state, $stockState)
            ->orderBy('name')
            ->paginate(10, ['*'], 'items_page')
            ->withQueryString();

        $movements = $this->movementsQuery($from, $to, $search, $movementType, $movementState)
            ->latest('occurred_at')
            ->latest('id')
            ->paginate(12, ['*'], 'movements_page')
            ->withQueryString();

        $activeItems = InventoryItem::query()->where('active', true);

        $totalStock = round((float) (clone $activeItems)->sum('stock'), 2);
        $inventoryValue = round((float) (clone $activeItems)
            ->get(['stock', 'unit_cost'])
            ->sum(fn (InventoryItem $item): float => $item->inventoryValue()), 2);

        return Inertia::render('Inventory/Index', [
            'currency' => $currency,
            'timezone' => $timezone,
            'period' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
            ],
            'kpis' => [
                'totalItems' => (clone $activeItems)->count(),
                'totalStock' => $totalStock,
                'lowStock' => (clone $activeItems)
                    ->where('stock', '>', 0)
                    ->whereColumn('stock', '<=', 'min_stock')
                    ->count(),
                'outOfStock' => (clone $activeItems)->where('stock', '<=', 0)->count(),
                'inventoryValue' => $inventoryValue,
            ],
            'items' => $items,
            'movements' => $movements,
            'alerts' => InventoryItem::query()
                ->where('active', true)
                ->whereColumn('stock', '<=', 'min_stock')
                ->orderBy('stock')
                ->limit(8)
                ->get(['id', 'name', 'sku', 'unit', 'stock', 'min_stock']),
            'itemsForMovement' => InventoryItem::query()
                ->where('active', true)
                ->orderBy('name')
                ->limit(300)
                ->get(['id', 'name', 'sku', 'unit', 'stock', 'min_stock', 'unit_cost']),
            'filters' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'search' => $search,
                'category' => $category,
                'state' => $state,
                'stock_state' => $stockState,
                'movement_type' => $movementType,
                'movement_state' => $movementState,
                'tab' => $tab,
            ],
            'options' => [
                'categories' => InventoryItem::CATEGORIES,
                'units' => InventoryItem::UNITS,
                'states' => self::STATES,
                'stockStates' => self::STOCK_STATES,
                'movementTypes' => InventoryMovement::TYPES,
                'movementStates' => self::MOVEMENT_STATES,
            ],
            'permissions' => [
                'manage' => $request->user()?->can(Permission::InventoryManage->value) ?? false,
                'adjust' => $request->user()?->can(Permission::InventoryAdjust->value) ?? false,
            ],
        ]);
    }

    public function storeItem(Request $request, InventoryService $service): RedirectResponse
    {
        $this->authorize(Permission::InventoryManage->value);

        $this->normalizeSku($request);

        $validated = $request->validate($this->itemRules(), [
            'name.required' => 'Indica el nombre del artículo.',
        ]);

        $service->createItem($validated, $request->user());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Artículo creado correctamente.',
        ]);

        return back();
    }

    public function updateItem(
        Request $request,
        InventoryItem $item,
        InventoryService $service,
    ): RedirectResponse {
        $this->authorize(Permission::InventoryManage->value);

        $this->normalizeSku($request);

        $validated = $request->validate($this->itemRules($item));

        $service->updateItem($item, $validated, $request->user());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Artículo actualizado correctamente.',
        ]);

        return back();
    }

    public function storeMovement(
        Request $request,
        InventoryItem $item,
        InventoryService $service,
    ): RedirectResponse {
        $this->authorize(Permission::InventoryManage->value);

        $validated = $request->validate([
            'type' => ['required', Rule::in(InventoryMovement::TYPES)],
            'quantity' => ['nullable', 'numeric', 'min:0.01', 'max:9999999', 'required_if:type,entrada,salida'],
            'counted_stock' => ['nullable', 'numeric', 'min:0', 'max:9999999', 'required_if:type,ajuste'],
            'unit_cost' => ['nullable', 'numeric', 'min:0', 'max:9999999'],
            'reason' => ['nullable', 'string', 'max:250', 'required_if:type,ajuste'],
            'reference' => ['nullable', 'string', 'max:120'],
            'occurred_at' => ['required', 'date'],
            'idempotency_key' => ['nullable', 'string', 'max:64'],
        ], [
            'reason.required_if' => 'Explica el motivo del ajuste de inventario.',
        ]);

        // Adjustments change the physical count and require the extra ability.
        if ($validated['type'] === InventoryMovement::AJUSTE) {
            $this->authorize(Permission::InventoryAdjust->value);
        }

        $service->registerMovement($item, $validated, $request->user());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Movimiento de inventario registrado.',
        ]);

        return back();
    }

    public function voidMovement(
        Request $request,
        InventoryMovement $movement,
        InventoryService $service,
    ): RedirectResponse {
        $this->authorize(Permission::InventoryAdjust->value);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $service->voidMovement($movement, $request->user(), $validated['reason']);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Movimiento anulado con su reverso en el libro.',
        ]);

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    private function itemRules(?InventoryItem $item = null): array
    {
        $hotelId = app(CurrentHotel::class)->id();

        return [
            'name' => ['required', 'string', 'max:120'],
            'sku' => [
                'nullable',
                'string',
                'max:60',
                Rule::unique('inventory_items', 'sku')
                    ->where(fn ($query) => $query->where('hotel_id', $hotelId))
                    ->ignore($item?->id),
            ],
            'category' => ['required', Rule::in(InventoryItem::CATEGORIES)],
            'unit' => ['required', Rule::in(InventoryItem::UNITS)],
            'min_stock' => ['nullable', 'numeric', 'min:0', 'max:9999999'],
            'unit_cost' => ['nullable', 'numeric', 'min:0', 'max:9999999'],
            'active' => ['boolean'],
        ];
    }

    /**
     * @return Builder<InventoryItem>
     */
    private function itemsQuery(
        string $search,
        string $category,
        string $state,
        string $stockState,
    ): Builder {
        return InventoryItem::query()
            ->when(
                $category !== '',
                fn (Builder $query) => $query->where('category', $category),
            )
            ->when(
                $state !== '',
                fn (Builder $query) => $query->where('active', $state === 'activo'),
            )
            ->when(
                $stockState === 'agotado',
                fn (Builder $query) => $query->where('stock', '<=', 0),
            )
            ->when(
                $stockState === 'bajo',
                fn (Builder $query) => $query
                    ->where('stock', '>', 0)
                    ->whereColumn('stock', '<=', 'min_stock'),
            )
            ->when($search !== '', function (Builder $query) use ($search): void {
                $query->where(function (Builder $query) use ($search): void {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%")
                        ->orWhere('category', 'like', "%{$search}%");
                });
            });
    }

    /**
     * @return Builder<InventoryMovement>
     */
    private function movementsQuery(
        CarbonImmutable $from,
        CarbonImmutable $to,
        string $search,
        string $type,
        string $state,
    ): Builder {
        return InventoryMovement::query()
            ->with([
                'item:id,name,sku,unit',
                'createdBy:id,name',
                'voidedBy:id,name',
            ])
            ->whereDate('occurred_at', '>=', $from->toDateString())
            ->whereDate('occurred_at', '<=', $to->toDateString())
            ->when(
                $type !== '',
                fn (Builder $query) => $query->where('type', $type),
            )
            ->when(
                $state === 'vigente',
                fn (Builder $query) => $query
                    ->whereNull('voided_at')
                    ->whereNull('reversal_of_id'),
            )
            ->when(
                $state === 'anulado',
                fn (Builder $query) => $query->whereNotNull('voided_at'),
            )
            ->when(
                $state === 'reverso',
                fn (Builder $query) => $query->whereNotNull('reversal_of_id'),
            )
            ->when($search !== '', function (Builder $query) use ($search): void {
                $query->where(function (Builder $query) use ($search): void {
                    $query->where('reason', 'like', "%{$search}%")
                        ->orWhere('reference', 'like', "%{$search}%")
                        ->orWhereHas('item', function (Builder $item) use ($search): void {
                            $item->where('name', 'like', "%{$search}%")
                                ->orWhere('sku', 'like', "%{$search}%");
                        });
                });
            });
    }

    private function normalizeSku(Request $request): void
    {
        if (! $request->filled('sku')) {
            $request->merge(['sku' => null]);

            return;
        }

        $request->merge([
            'sku' => mb_strtoupper(mb_substr(trim((string) $request->input('sku')), 0, 60)),
        ]);
    }

    /**
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    private function resolvePeriod(Request $request, string $timezone): array
    {
        $now = CarbonImmutable::now($timezone);
        $from = $this->parseDate($request->input('from'), $timezone)
            ?? $now->copy()->startOfMonth();
        $to = $this->parseDate($request->input('to'), $timezone)
            ?? $now;

        if ($from->greaterThan($to)) {
            [$from, $to] = [$to, $from];
        }

        return [$from->startOfDay(), $to->startOfDay()];
    }

    private function parseDate(mixed $value, string $timezone): ?CarbonImmutable
    {
        if (! is_string($value) || ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return null;
        }

        $date = CarbonImmutable::createFromFormat('!Y-m-d', $value, $timezone);

        return $date === false ? null : $date->startOfDay();
    }

    /**
     * @param  list<string>  $allowed
     */
    private function filterValue(Request $request, string $key, array $allowed): string
    {
        $value = (string) $request->input($key, '');

        return in_array($value, $allowed, true) ? $value : '';
    }
}
