<?php

namespace App\Http\Controllers;

use App\Models\Bill;
use App\Models\Expense;
use App\Models\FinanceMovement;
use App\Models\InventoryItem;
use App\Models\InventoryMovement;
use App\Models\Payment;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\ServiceRequest;
use App\Support\CurrentHotel;
use App\Support\Permission;
use Carbon\CarbonImmutable;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Cross-module reporting center.
 *
 * Every figure is derived from the real, hotel-scoped tables:
 * - invoiced totals come from active bills that were not voided;
 * - collected totals come from registered payments;
 * - expenses come from registered expenses;
 * - occupancy comes from active reservations, never cancelled ones.
 *
 * The three money figures are never mixed: an invoice is not a collection,
 * and a void is never subtracted twice because voided documents are excluded
 * and the ledger keeps its own reversing movements.
 */
class ReportsController extends Controller
{
    /**
     * @var list<string>
     */
    private const TABS = ['resumen', 'finanzas', 'operacion', 'servicios', 'inventario'];

    /**
     * @var list<string>
     */
    private const RESERVATION_STATUSES = ['Pendiente', 'Confirmada', 'En curso', 'Finalizada', 'Cancelada'];

    public function index(Request $request): Response
    {
        $this->authorize(Permission::ReportsView->value);

        $hotel = app(CurrentHotel::class)->model();
        $timezone = app(CurrentHotel::class)->timezone();
        $currency = app(CurrentHotel::class)->currency();

        [$from, $to] = $this->resolvePeriod($request, $timezone);
        $periodDays = (int) $from->diffInDays($to) + 1;
        $previousFrom = $from->copy()->subDays($periodDays);
        $previousTo = $from->copy()->subDay();

        $tab = (string) $request->input('tab', 'resumen');
        $tab = in_array($tab, self::TABS, true) ? $tab : 'resumen';
        $search = trim((string) $request->input('search', ''));

        $current = $this->totals($from, $to, $timezone);
        $previous = $this->totals($previousFrom, $previousTo, $timezone);

        $expensesByCategory = $this->expensesByCategory($from, $to);
        $revenueByMethod = $this->revenueByMethod($from, $to);

        return Inertia::render('Reports/Index', [
            'currency' => $currency,
            'timezone' => $timezone,
            'generatedAt' => CarbonImmutable::now($timezone)->toIso8601String(),
            'period' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'days' => $periodDays,
                'previousFrom' => $previousFrom->toDateString(),
                'previousTo' => $previousTo->toDateString(),
            ],
            'kpis' => [
                ...$current,
                'pending' => $this->pendingReceivable($to),
                'change' => [
                    'invoiced' => $this->percentChange($current['invoiced'], $previous['invoiced']),
                    'collected' => $this->percentChange($current['collected'], $previous['collected']),
                    'expenses' => $this->percentChange($current['expenses'], $previous['expenses']),
                    'net' => $this->percentChange($current['net'], $previous['net']),
                    'occupancy' => $this->percentChange($current['occupancyRate'], $previous['occupancyRate']),
                ],
            ],
            'previous' => $previous,
            'series' => $this->dailySeries($from, $to, $timezone),
            'expensesByCategory' => $expensesByCategory,
            'revenueByMethod' => $revenueByMethod,
            'reservationsByStatus' => $this->reservationsByStatus($from, $to, $timezone),
            'topServices' => $this->topServices($from, $to),
            'lowStock' => $this->lowStock(),
            'detail' => $this->detail($tab, $from, $to, $timezone, $search),
            'counts' => [
                'finanzas' => $this->financeCount($from, $to),
                'operacion' => $this->reservationsQuery($from, $to)->count(),
                'servicios' => $this->servicesQuery($from, $to)->count(),
                'inventario' => $this->inventoryQuery($from, $to)->count(),
            ],
            'filters' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'tab' => $tab,
                'search' => $search,
            ],
            'permissions' => [
                'export' => $request->user()?->can(Permission::ReportsExport->value) ?? false,
            ],
        ]);
    }

    /**
     * CSV export for the active report section. It is intentionally
     * Excel-compatible (UTF-8 BOM) so it opens correctly without extra
     * packages; a print action covers the PDF view from the browser.
     */
    public function export(Request $request): StreamedResponse
    {
        $this->authorize(Permission::ReportsExport->value);

        $hotel = app(CurrentHotel::class)->model();
        $timezone = app(CurrentHotel::class)->timezone();

        [$from, $to] = $this->resolvePeriod($request, $timezone);
        $periodDays = (int) $from->diffInDays($to) + 1;
        $previousFrom = $from->copy()->subDays($periodDays);
        $previousTo = $from->copy()->subDay();

        $type = (string) $request->input('type', 'resumen');
        $type = in_array($type, self::TABS, true) ? $type : 'resumen';

        $filename = "reportes-{$type}-{$from->toDateString()}-{$to->toDateString()}.csv";

        return response()->streamDownload(function () use ($type, $from, $to, $previousFrom, $previousTo, $timezone): void {
            $handle = fopen('php://output', 'w');

            if ($handle === false) {
                return;
            }

            fwrite($handle, "\xEF\xBB\xBF");

            match ($type) {
                'finanzas' => $this->exportFinance($handle, $from, $to),
                'operacion' => $this->exportOperation($handle, $from, $to, $timezone),
                'servicios' => $this->exportServices($handle, $from, $to),
                'inventario' => $this->exportInventory($handle, $from, $to),
                default => $this->exportSummary($handle, $from, $to, $previousFrom, $previousTo, $timezone),
            };

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /**
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    private function resolvePeriod(Request $request, string $timezone): array
    {
        $now = CarbonImmutable::now($timezone);
        $preset = (string) $request->input('preset', '');

        $from = $this->parseDate($request->input('from'), $timezone);
        $to = $this->parseDate($request->input('to'), $timezone);

        if ($from === null || $to === null) {
            [$from, $to] = match ($preset) {
                'mes_anterior' => [
                    $now->copy()->subMonthNoOverflow()->startOfMonth(),
                    $now->copy()->subMonthNoOverflow()->endOfMonth(),
                ],
                '30' => [$now->copy()->subDays(29), $now->copy()],
                'anio' => [$now->copy()->startOfYear(), $now->copy()],
                default => [$now->copy()->startOfMonth(), $now->copy()],
            };
        }

        if ($from->greaterThan($to)) {
            [$from, $to] = [$to, $from];
        }

        // Keep requests and charts bounded to a year of daily points.
        if ((int) $from->diffInDays($to) > 365) {
            $from = $to->copy()->subDays(365);
        }

        return [$from->startOfDay(), $to->startOfDay()];
    }

    private function parseDate(mixed $value, string $timezone): ?CarbonImmutable
    {
        if (! is_string($value) || ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return null;
        }

        $date = CarbonImmutable::createFromFormat('!Y-m-d', $value, $timezone);

        return $date instanceof CarbonImmutable ? $date->startOfDay() : null;
    }

    /**
     * Aggregated totals for one period. Money figures stay independent.
     *
     * @return array<string, int|float>
     */
    private function totals(CarbonImmutable $from, CarbonImmutable $to, string $timezone): array
    {
        $invoicedQuery = $this->invoicedQuery($from, $to);
        $invoiced = round((float) (clone $invoicedQuery)->sum('total'), 2);
        $invoicedCount = (clone $invoicedQuery)->count();

        $paymentsQuery = $this->collectionsQuery($from, $to);
        $collected = round((float) (clone $paymentsQuery)->sum('amount'), 2);
        $collectedCount = (clone $paymentsQuery)->count();

        $expensesQuery = $this->expensesQuery($from, $to);
        $expenses = round((float) (clone $expensesQuery)->sum('amount'), 2);
        $expensesCount = (clone $expensesQuery)->count();

        $servicesQuery = ServiceRequest::query()
            ->where('status', ServiceRequest::FACTURADO)
            ->whereDate('billed_at', '>=', $from->toDateString())
            ->whereDate('billed_at', '<=', $to->toDateString());

        $serviceRevenue = round((float) (clone $servicesQuery)->sum('total'), 2);
        $serviceCount = (clone $servicesQuery)->count();

        $reservations = $this->reservationsQuery($from, $to)->get([
            'id',
            'reserved_at',
            'finished_at',
            'guests',
        ]);

        $occupancy = $this->occupancyStats($reservations, $from, $to, $timezone);
        $activeRooms = $this->activeRooms();
        $periodDays = (int) $from->diffInDays($to) + 1;
        $capacity = $activeRooms * $periodDays;

        return [
            'invoiced' => $invoiced,
            'invoicedCount' => $invoicedCount,
            'collected' => $collected,
            'collectedCount' => $collectedCount,
            'expenses' => $expenses,
            'expensesCount' => $expensesCount,
            'net' => round($collected - $expenses, 2),
            'serviceRevenue' => $serviceRevenue,
            'serviceCount' => $serviceCount,
            'reservations' => $reservations->count(),
            'guests' => $occupancy['guests'],
            'roomNights' => $occupancy['roomNights'],
            'activeRooms' => $activeRooms,
            'occupancyRate' => $capacity > 0
                ? round(($occupancy['roomNights'] / $capacity) * 100, 1)
                : 0.0,
            'averageTicket' => $invoicedCount > 0
                ? round($invoiced / $invoicedCount, 2)
                : 0.0,
        ];
    }

    /**
     * @return Builder<Bill>
     */
    private function invoicedQuery(CarbonImmutable $from, CarbonImmutable $to): Builder
    {
        return Bill::query()
            ->where('active', true)
            ->where('status', '!=', 'Anulada')
            ->whereDate('issued_at', '>=', $from->toDateString())
            ->whereDate('issued_at', '<=', $to->toDateString());
    }

    /**
     * @return Builder<Payment>
     */
    private function collectionsQuery(CarbonImmutable $from, CarbonImmutable $to): Builder
    {
        return Payment::query()
            ->where('status', 'registrado')
            ->whereDate('paid_at', '>=', $from->toDateString())
            ->whereDate('paid_at', '<=', $to->toDateString());
    }

    /**
     * @return Builder<Expense>
     */
    private function expensesQuery(CarbonImmutable $from, CarbonImmutable $to): Builder
    {
        return Expense::query()
            ->where('status', 'registrado')
            ->whereDate('expense_date', '>=', $from->toDateString())
            ->whereDate('expense_date', '<=', $to->toDateString());
    }

    /**
     * Reservations that overlap the period, excluding cancelled ones.
     *
     * @return Builder<Reservation>
     */
    private function reservationsQuery(CarbonImmutable $from, CarbonImmutable $to): Builder
    {
        return Reservation::query()
            ->where('active', true)
            ->where('status', '!=', 'Cancelada')
            ->where('reserved_at', '<', $to->copy()->addDay()->startOfDay()->utc())
            ->where(function (Builder $query) use ($from): void {
                $query->whereNull('finished_at')
                    ->orWhere('finished_at', '>=', $from->copy()->startOfDay()->utc());
            });
    }

    /**
     * @param  Collection<int, Reservation>  $reservations
     * @return array{byDate: array<string, int>, roomNights: int, guests: int}
     */
    private function occupancyStats(
        Collection $reservations,
        CarbonImmutable $from,
        CarbonImmutable $to,
        string $timezone,
    ): array {
        $byDate = [];
        $roomNights = 0;
        $guests = 0;
        $periodEnd = $to->copy()->addDay();

        foreach ($reservations as $reservation) {
            $arrival = $reservation->reserved_at
                ->copy()
                ->setTimezone($timezone)
                ->startOfDay();

            $departure = $reservation->finished_at
                ?->copy()
                ->setTimezone($timezone)
                ->startOfDay();

            if ($departure === null || $departure->lessThanOrEqualTo($arrival)) {
                $departure = $arrival->copy()->addDay();
            }

            $start = $arrival->greaterThan($from) ? $arrival->copy() : $from->copy();
            $end = $departure->lessThan($periodEnd) ? $departure->copy() : $periodEnd->copy();

            if ($end->lessThanOrEqualTo($start)) {
                continue;
            }

            $nights = (int) $start->diffInDays($end);

            if ($nights <= 0) {
                continue;
            }

            $roomNights += $nights;
            $guests += (int) $reservation->guests;

            for ($offset = 0; $offset < $nights; $offset++) {
                $date = $start->copy()->addDays($offset)->toDateString();
                $byDate[$date] = ($byDate[$date] ?? 0) + 1;
            }
        }

        return ['byDate' => $byDate, 'roomNights' => $roomNights, 'guests' => $guests];
    }

    private function activeRooms(): int
    {
        return Room::query()->where('active', true)->count();
    }

    /**
     * Daily invoiced, collected, expenses and occupancy for the chart.
     *
     * @return list<array{date: string, invoiced: float, collected: float, expenses: float, occupancy: float}>
     */
    private function dailySeries(
        CarbonImmutable $from,
        CarbonImmutable $to,
        string $timezone,
    ): array {
        $invoicedByDate = $this->invoicedQuery($from, $to)
            ->get(['issued_at', 'total'])
            ->groupBy(fn (Bill $bill) => $bill->issued_at->toDateString())
            ->map(fn ($bills) => round((float) $bills->sum('total'), 2));

        $collectedByDate = $this->collectionsQuery($from, $to)
            ->get(['paid_at', 'amount'])
            ->groupBy(fn (Payment $payment) => $payment->paid_at->toDateString())
            ->map(fn ($payments) => round((float) $payments->sum('amount'), 2));

        $expensesByDate = $this->expensesQuery($from, $to)
            ->get(['expense_date', 'amount'])
            ->groupBy(fn (Expense $expense) => $expense->expense_date->toDateString())
            ->map(fn ($expenses) => round((float) $expenses->sum('amount'), 2));

        $reservations = $this->reservationsQuery($from, $to)->get([
            'id',
            'reserved_at',
            'finished_at',
            'guests',
        ]);

        $occupancy = $this->occupancyStats($reservations, $from, $to, $timezone);
        $activeRooms = $this->activeRooms();
        $days = (int) $from->diffInDays($to) + 1;

        return array_values(collect(range(0, max(0, $days - 1)))
            ->map(function (int $offset) use ($from, $activeRooms, $invoicedByDate, $collectedByDate, $expensesByDate, $occupancy): array {
                $date = $from->copy()->addDays($offset)->toDateString();
                $nights = (int) ($occupancy['byDate'][$date] ?? 0);

                return [
                    'date' => $date,
                    'invoiced' => (float) ($invoicedByDate[$date] ?? 0),
                    'collected' => (float) ($collectedByDate[$date] ?? 0),
                    'expenses' => (float) ($expensesByDate[$date] ?? 0),
                    'occupancy' => $activeRooms > 0
                        ? round(($nights / $activeRooms) * 100, 1)
                        : 0.0,
                ];
            })
            ->values()
            ->all());
    }

    /**
     * @return list<array{category: string, amount: float}>
     */
    private function expensesByCategory(CarbonImmutable $from, CarbonImmutable $to): array
    {
        return array_values($this->expensesQuery($from, $to)
            ->get(['category', 'amount'])
            ->groupBy('category')
            ->map(fn ($expenses, string $category): array => [
                'category' => $category,
                'amount' => round((float) $expenses->sum('amount'), 2),
            ])
            ->sortByDesc('amount')
            ->values()
            ->all());
    }

    /**
     * @return list<array{method: string, amount: float, count: int}>
     */
    private function revenueByMethod(CarbonImmutable $from, CarbonImmutable $to): array
    {
        return array_values($this->collectionsQuery($from, $to)
            ->get(['method', 'amount'])
            ->groupBy('method')
            ->map(fn ($payments, string $method): array => [
                'method' => $method,
                'amount' => round((float) $payments->sum('amount'), 2),
                'count' => (int) $payments->count(),
            ])
            ->sortByDesc('amount')
            ->values()
            ->all());
    }

    /**
     * @return list<array{status: string, count: int}>
     */
    private function reservationsByStatus(
        CarbonImmutable $from,
        CarbonImmutable $to,
        string $timezone,
    ): array {
        $counts = $this->reservationsQuery($from, $to)
            ->get(['id', 'reserved_at', 'finished_at', 'guests', 'status'])
            ->countBy('status');

        $known = collect(self::RESERVATION_STATUSES)
            ->map(fn (string $status): array => [
                'status' => $status,
                'count' => (int) ($counts[$status] ?? 0),
            ]);

        $extra = $counts
            ->except(self::RESERVATION_STATUSES)
            ->map(fn (int $count, string $status): array => [
                'status' => $status,
                'count' => $count,
            ])
            ->values();

        return array_values($known->concat($extra)->all());
    }

    /**
     * @return list<array{service: string, quantity: int, total: float}>
     */
    private function topServices(CarbonImmutable $from, CarbonImmutable $to): array
    {
        return array_values(ServiceRequest::query()
            ->with('service:id,name')
            ->whereDate('requested_at', '>=', $from->toDateString())
            ->whereDate('requested_at', '<=', $to->toDateString())
            ->where('status', '!=', ServiceRequest::ANULADO)
            ->get(['id', 'service_id', 'quantity', 'total'])
            ->groupBy(fn (ServiceRequest $request) => $request->service->name)
            ->map(fn ($requests, string $service): array => [
                'service' => $service,
                'quantity' => (int) $requests->sum('quantity'),
                'total' => round((float) $requests->sum('total'), 2),
            ])
            ->sortByDesc('total')
            ->take(6)
            ->values()
            ->all());
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function lowStock(): array
    {
        return array_values(InventoryItem::query()
            ->where('active', true)
            ->whereColumn('stock', '<=', 'min_stock')
            ->orderBy('stock')
            ->orderBy('name')
            ->limit(6)
            ->get(['id', 'name', 'sku', 'unit', 'stock', 'min_stock'])
            ->map(fn (InventoryItem $item): array => [
                'id' => $item->id,
                'name' => $item->name,
                'sku' => $item->sku,
                'unit' => $item->unit,
                'stock' => round((float) $item->stock, 2),
                'minStock' => round((float) $item->min_stock, 2),
            ])
            ->all());
    }

    /**
     * Receivable balance as of the end of the period.
     */
    private function pendingReceivable(CarbonImmutable $to): float
    {
        $billed = (float) Bill::query()
            ->where('active', true)
            ->where('status', '!=', 'Anulada')
            ->whereDate('issued_at', '<=', $to->toDateString())
            ->sum('total');

        $collected = (float) Payment::query()
            ->where('status', 'registrado')
            ->whereDate('paid_at', '<=', $to->toDateString())
            ->sum('amount');

        return round(max(0, $billed - $collected), 2);
    }

    private function percentChange(float $current, float $previous): ?float
    {
        if ($previous <= 0.0) {
            return null;
        }

        return round((($current - $previous) / $previous) * 100, 1);
    }

    /**
     * @return LengthAwarePaginator<int, array<string, mixed>>|null
     */
    private function detail(
        string $tab,
        CarbonImmutable $from,
        CarbonImmutable $to,
        string $timezone,
        string $search,
    ): mixed {
        return match ($tab) {
            'finanzas' => $this->financeDetail($from, $to, $search),
            'operacion' => $this->operationDetail($from, $to, $timezone, $search),
            'servicios' => $this->serviceDetail($from, $to, $search),
            'inventario' => $this->inventoryDetail($from, $to, $search),
            default => null,
        };
    }

    private function financeCount(CarbonImmutable $from, CarbonImmutable $to): int
    {
        return FinanceMovement::query()
            ->whereDate('occurred_at', '>=', $from->toDateString())
            ->whereDate('occurred_at', '<=', $to->toDateString())
            ->count();
    }

    /**
     * @return LengthAwarePaginator<int, array<string, mixed>>
     */
    private function financeDetail(
        CarbonImmutable $from,
        CarbonImmutable $to,
        string $search,
    ): mixed {
        return FinanceMovement::query()
            ->with('createdBy:id,name')
            ->whereDate('occurred_at', '>=', $from->toDateString())
            ->whereDate('occurred_at', '<=', $to->toDateString())
            ->when($search !== '', function (Builder $query) use ($search): void {
                $query->where(function (Builder $query) use ($search): void {
                    $query->where('description', 'like', "%{$search}%")
                        ->orWhere('direction', 'like', "%{$search}%");
                });
            })
            ->latest('occurred_at')
            ->latest('id')
            ->paginate(12, ['*'], 'detail_page')
            ->withQueryString()
            ->through(fn (FinanceMovement $movement): array => $this->financeRow($movement));
    }

    /**
     * @return array<string, mixed>
     */
    private function financeRow(FinanceMovement $movement): array
    {
        return [
            'id' => $movement->id,
            'date' => $movement->occurred_at->toDateString(),
            'direction' => $movement->direction,
            'amount' => round((float) $movement->amount, 2),
            'description' => $movement->description,
            'reversalOfId' => $movement->reversal_of_id,
            'createdBy' => $movement->createdBy?->name,
        ];
    }

    /**
     * @return LengthAwarePaginator<int, array<string, mixed>>
     */
    private function operationDetail(
        CarbonImmutable $from,
        CarbonImmutable $to,
        string $timezone,
        string $search,
    ): mixed {
        return $this->reservationsQuery($from, $to)
            ->with(['client:id,first_name,last_name', 'room:id,name'])
            ->when($search !== '', function (Builder $query) use ($search): void {
                $query->where(function (Builder $query) use ($search): void {
                    $query->where('status', 'like', "%{$search}%")
                        ->orWhereHas('client', function (Builder $client) use ($search): void {
                            $client->where('first_name', 'like', "%{$search}%")
                                ->orWhere('last_name', 'like', "%{$search}%");
                        })
                        ->orWhereHas('room', function (Builder $room) use ($search): void {
                            $room->where('name', 'like', "%{$search}%");
                        });
                });
            })
            ->orderByDesc('reserved_at')
            ->orderByDesc('id')
            ->paginate(10, ['*'], 'detail_page')
            ->withQueryString()
            ->through(fn (Reservation $reservation): array => $this->operationRow($reservation, $timezone));
    }

    /**
     * @return array<string, mixed>
     */
    private function operationRow(Reservation $reservation, string $timezone): array
    {
        return [
            'id' => $reservation->id,
            'client' => $reservation->client
                ? trim($reservation->client->first_name.' '.$reservation->client->last_name)
                : 'Sin huésped',
            'room' => $reservation->room->name,
            'status' => $reservation->status,
            'guests' => (int) $reservation->guests,
            'arrival' => $reservation->reserved_at->copy()->setTimezone($timezone)->toDateString(),
            'departure' => $reservation->finished_at?->copy()->setTimezone($timezone)->toDateString(),
            'nights' => $this->reservationNights($reservation),
        ];
    }

    private function reservationNights(Reservation $reservation): int
    {
        $arrival = $reservation->reserved_at->copy()->startOfDay();
        $departure = $reservation->finished_at?->copy()->startOfDay();

        if ($departure === null || $departure->lessThanOrEqualTo($arrival)) {
            return 1;
        }

        return max(0, (int) $arrival->diffInDays($departure));
    }

    /**
     * @return Builder<ServiceRequest>
     */
    private function servicesQuery(CarbonImmutable $from, CarbonImmutable $to): Builder
    {
        return ServiceRequest::query()
            ->whereDate('requested_at', '>=', $from->toDateString())
            ->whereDate('requested_at', '<=', $to->toDateString());
    }

    /**
     * @return LengthAwarePaginator<int, array<string, mixed>>
     */
    private function serviceDetail(
        CarbonImmutable $from,
        CarbonImmutable $to,
        string $search,
    ): mixed {
        return $this->servicesQuery($from, $to)
            ->with(['service:id,name,category', 'client:id,first_name,last_name'])
            ->when($search !== '', function (Builder $query) use ($search): void {
                $query->where(function (Builder $query) use ($search): void {
                    $query->where('status', 'like', "%{$search}%")
                        ->orWhereHas('service', function (Builder $service) use ($search): void {
                            $service->where('name', 'like', "%{$search}%");
                        })
                        ->orWhereHas('client', function (Builder $client) use ($search): void {
                            $client->where('first_name', 'like', "%{$search}%")
                                ->orWhere('last_name', 'like', "%{$search}%");
                        });
                });
            })
            ->latest('requested_at')
            ->latest('id')
            ->paginate(10, ['*'], 'detail_page')
            ->withQueryString()
            ->through(fn (ServiceRequest $request): array => $this->serviceRow($request));
    }

    /**
     * @return array<string, mixed>
     */
    private function serviceRow(ServiceRequest $request): array
    {
        return [
            'id' => $request->id,
            'service' => $request->service->name,
            'category' => $request->service->category,
            'client' => $request->client
                ? trim($request->client->first_name.' '.$request->client->last_name)
                : null,
            'status' => $request->status,
            'quantity' => (int) $request->quantity,
            'total' => round((float) $request->total, 2),
            'requestedAt' => $request->requested_at->toDateString(),
        ];
    }

    /**
     * @return Builder<InventoryMovement>
     */
    private function inventoryQuery(CarbonImmutable $from, CarbonImmutable $to): Builder
    {
        return InventoryMovement::query()
            ->whereDate('occurred_at', '>=', $from->toDateString())
            ->whereDate('occurred_at', '<=', $to->toDateString());
    }

    /**
     * @return LengthAwarePaginator<int, array<string, mixed>>
     */
    private function inventoryDetail(
        CarbonImmutable $from,
        CarbonImmutable $to,
        string $search,
    ): mixed {
        return $this->inventoryQuery($from, $to)
            ->with(['item:id,name,sku,unit', 'createdBy:id,name'])
            ->when($search !== '', function (Builder $query) use ($search): void {
                $query->where(function (Builder $query) use ($search): void {
                    $query->where('reason', 'like', "%{$search}%")
                        ->orWhere('reference', 'like', "%{$search}%")
                        ->orWhereHas('item', function (Builder $item) use ($search): void {
                            $item->where('name', 'like', "%{$search}%")
                                ->orWhere('sku', 'like', "%{$search}%");
                        });
                });
            })
            ->latest('occurred_at')
            ->latest('id')
            ->paginate(12, ['*'], 'detail_page')
            ->withQueryString()
            ->through(fn (InventoryMovement $movement): array => $this->inventoryRow($movement));
    }

    /**
     * @return array<string, mixed>
     */
    private function inventoryRow(InventoryMovement $movement): array
    {
        return [
            'id' => $movement->id,
            'item' => $movement->item->name,
            'sku' => $movement->item->sku,
            'unit' => $movement->item->unit,
            'type' => $movement->type,
            'quantity' => round((float) $movement->quantity, 2),
            'unitCost' => $movement->unit_cost === null ? null : round((float) $movement->unit_cost, 2),
            'reason' => $movement->reason,
            'reference' => $movement->reference,
            'date' => $movement->occurred_at->toDateString(),
            'state' => $movement->voided_at !== null
                ? 'anulado'
                : ($movement->reversal_of_id !== null ? 'reverso' : 'vigente'),
            'createdBy' => $movement->createdBy?->name,
        ];
    }

    /**
     * @param  resource  $handle
     */
    private function exportSummary(
        $handle,
        CarbonImmutable $from,
        CarbonImmutable $to,
        CarbonImmutable $previousFrom,
        CarbonImmutable $previousTo,
        string $timezone,
    ): void {
        $current = $this->totals($from, $to, $timezone);
        $previous = $this->totals($previousFrom, $previousTo, $timezone);

        fputcsv($handle, ['Indicador', 'Período actual', 'Período anterior', 'Cambio %']);

        $rows = [
            ['Facturado', $current['invoiced'], $previous['invoiced']],
            ['Cobrado', $current['collected'], $previous['collected']],
            ['Gastos', $current['expenses'], $previous['expenses']],
            ['Flujo neto', $current['net'], $previous['net']],
            ['Ocupación %', $current['occupancyRate'], $previous['occupancyRate']],
            ['Habitaciones-noche', $current['roomNights'], $previous['roomNights']],
            ['Reservas', $current['reservations'], $previous['reservations']],
            ['Huéspedes', $current['guests'], $previous['guests']],
            ['Servicios facturados', $current['serviceRevenue'], $previous['serviceRevenue']],
        ];

        foreach ($rows as [$label, $now, $before]) {
            fputcsv($handle, [
                $label,
                number_format((float) $now, 2, '.', ''),
                number_format((float) $before, 2, '.', ''),
                $this->percentChange((float) $now, (float) $before) ?? '',
            ]);
        }

        fputcsv($handle, []);
        fputcsv($handle, ['Gastos por categoría', 'Monto']);

        foreach ($this->expensesByCategory($from, $to) as $row) {
            fputcsv($handle, [$row['category'], number_format($row['amount'], 2, '.', '')]);
        }

        fputcsv($handle, []);
        fputcsv($handle, ['Cobros por método', 'Monto', 'Operaciones']);

        foreach ($this->revenueByMethod($from, $to) as $row) {
            fputcsv($handle, [
                $row['method'],
                number_format($row['amount'], 2, '.', ''),
                $row['count'],
            ]);
        }

        fputcsv($handle, []);
        fputcsv($handle, ['Reservas por estado', 'Total']);

        foreach ($this->reservationsByStatus($from, $to, $timezone) as $row) {
            fputcsv($handle, [$row['status'], $row['count']]);
        }

        fputcsv($handle, []);
        fputcsv($handle, ['Servicios más solicitados', 'Cantidad', 'Monto']);

        foreach ($this->topServices($from, $to) as $row) {
            fputcsv($handle, [
                $row['service'],
                $row['quantity'],
                number_format($row['total'], 2, '.', ''),
            ]);
        }
    }

    /**
     * @param  resource  $handle
     */
    private function exportFinance($handle, CarbonImmutable $from, CarbonImmutable $to): void
    {
        fputcsv($handle, ['Movimiento', 'Fecha', 'Dirección', 'Monto', 'Descripción', 'Reversa de', 'Registrado por']);

        FinanceMovement::query()
            ->with('createdBy:id,name')
            ->whereDate('occurred_at', '>=', $from->toDateString())
            ->whereDate('occurred_at', '<=', $to->toDateString())
            ->orderBy('occurred_at')
            ->orderBy('id')
            ->cursor()
            ->each(function (FinanceMovement $movement) use ($handle): void {
                fputcsv($handle, [
                    $movement->id,
                    $movement->occurred_at->toDateString(),
                    $movement->direction,
                    number_format((float) $movement->amount, 2, '.', ''),
                    $movement->description,
                    $movement->reversal_of_id,
                    $movement->createdBy?->name,
                ]);
            });
    }

    /**
     * @param  resource  $handle
     */
    private function exportOperation(
        $handle,
        CarbonImmutable $from,
        CarbonImmutable $to,
        string $timezone,
    ): void {
        fputcsv($handle, ['Reserva', 'Cliente', 'Habitación', 'Llegada', 'Salida', 'Noches', 'Huéspedes', 'Estado']);

        $this->reservationsQuery($from, $to)
            ->with(['client:id,first_name,last_name', 'room:id,name'])
            ->orderBy('reserved_at')
            ->cursor()
            ->each(function (Reservation $reservation) use ($handle, $timezone): void {
                fputcsv($handle, [
                    $reservation->id,
                    $reservation->client
                        ? trim($reservation->client->first_name.' '.$reservation->client->last_name)
                        : '',
                    $reservation->room?->name,
                    $reservation->reserved_at->copy()->setTimezone($timezone)->toDateString(),
                    $reservation->finished_at?->copy()->setTimezone($timezone)->toDateString(),
                    $this->reservationNights($reservation),
                    (int) $reservation->guests,
                    $reservation->status,
                ]);
            });
    }

    /**
     * @param  resource  $handle
     */
    private function exportServices($handle, CarbonImmutable $from, CarbonImmutable $to): void
    {
        fputcsv($handle, ['Solicitud', 'Servicio', 'Cliente', 'Fecha', 'Cantidad', 'Total', 'Estado']);

        $this->servicesQuery($from, $to)
            ->with(['service:id,name', 'client:id,first_name,last_name'])
            ->orderBy('requested_at')
            ->orderBy('id')
            ->cursor()
            ->each(function (ServiceRequest $request) use ($handle): void {
                fputcsv($handle, [
                    $request->id,
                    $request->service?->name,
                    $request->client
                        ? trim($request->client->first_name.' '.$request->client->last_name)
                        : '',
                    $request->requested_at->toDateString(),
                    (int) $request->quantity,
                    number_format((float) $request->total, 2, '.', ''),
                    $request->status,
                ]);
            });
    }

    /**
     * @param  resource  $handle
     */
    private function exportInventory($handle, CarbonImmutable $from, CarbonImmutable $to): void
    {
        fputcsv($handle, ['Movimiento', 'Artículo', 'SKU', 'Fecha', 'Tipo', 'Cantidad', 'Costo unitario', 'Motivo', 'Referencia', 'Estado']);

        $this->inventoryQuery($from, $to)
            ->with('item:id,name,sku')
            ->orderBy('occurred_at')
            ->orderBy('id')
            ->cursor()
            ->each(function (InventoryMovement $movement) use ($handle): void {
                fputcsv($handle, [
                    $movement->id,
                    $movement->item?->name,
                    $movement->item?->sku,
                    $movement->occurred_at->toDateString(),
                    $movement->type,
                    number_format((float) $movement->quantity, 2, '.', ''),
                    $movement->unit_cost === null
                        ? ''
                        : number_format((float) $movement->unit_cost, 2, '.', ''),
                    $movement->reason,
                    $movement->reference,
                    $movement->voided_at !== null
                        ? 'anulado'
                        : ($movement->reversal_of_id !== null ? 'reverso' : 'vigente'),
                ]);
            });
    }
}
