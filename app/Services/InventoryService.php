<?php

namespace App\Services;

use App\Models\InventoryItem;
use App\Models\InventoryMovement;
use App\Models\User;
use App\Support\CurrentHotel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Inventory operations that must keep the ledger and the cached balance
 * consistent.
 *
 * Rules enforced here (never only in the frontend):
 * - every write runs inside a transaction and locks the item row;
 * - no operation may leave the stock below zero;
 * - movements are append-only: voiding inserts the opposite movement;
 * - a movement can only be reversed once and a reversal cannot be reversed;
 * - an idempotency key prevents registering the same movement twice.
 */
class InventoryService
{
    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * @param  array{name: string, sku?: ?string, category: string, unit: string, min_stock?: float|string, unit_cost?: float|string, active?: bool}  $data
     */
    public function createItem(array $data, User $user): InventoryItem
    {
        return DB::transaction(function () use ($data): InventoryItem {
            $item = InventoryItem::create([
                'name' => trim($data['name']),
                'sku' => $this->normalizeSku($data['sku'] ?? null),
                'category' => $data['category'],
                'unit' => $data['unit'],
                'min_stock' => round((float) ($data['min_stock'] ?? 0), 2),
                'unit_cost' => round((float) ($data['unit_cost'] ?? 0), 2),
                'stock' => 0,
                'active' => $data['active'] ?? true,
            ]);

            $this->audit->record(
                module: 'inventory',
                action: 'item_created',
                subject: $item,
                description: "Artículo de inventario creado: {$item->name}",
                changes: [
                    'name' => $item->name,
                    'sku' => $item->sku,
                    'category' => $item->category,
                    'unit' => $item->unit,
                    'min_stock' => (float) $item->min_stock,
                ],
            );

            return $item->refresh();
        });
    }

    /**
     * @param  array{name: string, sku?: ?string, category: string, unit: string, min_stock?: float|string, unit_cost?: float|string, active?: bool}  $data
     */
    public function updateItem(InventoryItem $item, array $data, User $user): InventoryItem
    {
        return DB::transaction(function () use ($item, $data): InventoryItem {
            $item = InventoryItem::query()->lockForUpdate()->findOrFail((int) $item->getKey());

            // Capture the previous state before save(), because getOriginal()
            // returns the new values once the model has been persisted.
            $before = [
                'name' => $item->name,
                'sku' => $item->sku,
                'category' => $item->category,
                'unit' => $item->unit,
                'min_stock' => (float) $item->min_stock,
                'unit_cost' => (float) $item->unit_cost,
                'active' => (bool) $item->active,
            ];

            $item->fill([
                'name' => trim($data['name']),
                'sku' => $this->normalizeSku($data['sku'] ?? null),
                'category' => $data['category'],
                'unit' => $data['unit'],
                'min_stock' => round((float) ($data['min_stock'] ?? 0), 2),
                'unit_cost' => round((float) ($data['unit_cost'] ?? 0), 2),
                'active' => $data['active'] ?? $item->active,
            ])->save();

            $this->audit->record(
                module: 'inventory',
                action: 'item_updated',
                subject: $item,
                description: "Artículo de inventario actualizado: {$item->name}",
                changes: [
                    'before' => $before,
                    'after' => [
                        'name' => $item->name,
                        'sku' => $item->sku,
                        'category' => $item->category,
                        'unit' => $item->unit,
                        'min_stock' => (float) $item->min_stock,
                        'unit_cost' => (float) $item->unit_cost,
                        'active' => (bool) $item->active,
                    ],
                ],
            );

            return $item->refresh();
        });
    }

    /**
     * Register an entry, an exit or a physical count adjustment.
     *
     * `quantities` are positive for entries and exits; an adjustment receives
     * the counted stock and the service derives the delta.
     *
     * @param  array{type: string, quantity?: float|string, counted_stock?: float|string, unit_cost?: float|string, reason?: ?string, reference?: ?string, occurred_at: string, idempotency_key?: ?string}  $data
     */
    public function registerMovement(InventoryItem $item, array $data, User $user): InventoryMovement
    {
        return DB::transaction(function () use ($item, $data, $user): InventoryMovement {
            $item = InventoryItem::query()->lockForUpdate()->findOrFail((int) $item->getKey());

            if (! $item->active) {
                throw ValidationException::withMessages([
                    'inventory_item_id' => 'El artículo está inactivo y no acepta movimientos.',
                ]);
            }

            $type = $data['type'];
            $stock = (float) $item->stock;
            $key = $this->normalizeKey($data['idempotency_key'] ?? null);

            if ($type === InventoryMovement::AJUSTE) {
                $counted = round((float) ($data['counted_stock'] ?? 0), 2);

                if ($counted < 0) {
                    throw ValidationException::withMessages([
                        'counted_stock' => 'El conteo físico no puede ser negativo.',
                    ]);
                }

                $delta = round($counted - $stock, 2);
            } else {
                $quantity = round((float) ($data['quantity'] ?? 0), 2);

                if ($quantity <= 0) {
                    throw ValidationException::withMessages([
                        'quantity' => 'La cantidad debe ser mayor que cero.',
                    ]);
                }

                $delta = $type === InventoryMovement::ENTRADA ? $quantity : -$quantity;
            }

            if (abs($delta) < 0.005) {
                throw ValidationException::withMessages([
                    'counted_stock' => 'El conteo coincide con el stock actual; no hay nada que ajustar.',
                ]);
            }

            if ($key !== null) {
                $existing = InventoryMovement::query()
                    ->where('idempotency_key', $key)
                    ->first();

                if ($existing !== null) {
                    $sameMovement = (int) $existing->inventory_item_id === (int) $item->id
                        && $existing->type === $type
                        && abs((float) $existing->quantity - $delta) < 0.005;

                    if (! $sameMovement) {
                        throw ValidationException::withMessages([
                            'idempotency_key' => 'La clave de idempotencia ya fue usada con otros datos.',
                        ]);
                    }

                    return $existing;
                }
            }

            $newStock = round($stock + $delta, 2);

            if ($newStock < -0.005) {
                throw ValidationException::withMessages([
                    'quantity' => 'La operación dejaría el stock en negativo. Stock disponible: '.number_format($stock, 2).'.',
                ]);
            }

            $movement = InventoryMovement::create([
                'inventory_item_id' => $item->id,
                'type' => $type,
                'quantity' => $delta,
                'unit_cost' => isset($data['unit_cost'])
                    ? round((float) $data['unit_cost'], 2)
                    : (float) $item->unit_cost,
                'reason' => $this->cleanReason($data['reason'] ?? null),
                'reference' => $this->cleanReason($data['reference'] ?? null),
                'occurred_at' => $data['occurred_at'],
                'idempotency_key' => $key,
                'created_by' => $user->id,
            ]);

            $item->forceFill(['stock' => max(0, $newStock)])->save();

            $this->audit->record(
                module: 'inventory',
                action: 'movement_registered',
                subject: $movement,
                description: "Movimiento de inventario {$type} para {$item->name}",
                changes: [
                    'item_id' => $item->id,
                    'type' => $type,
                    'quantity' => $delta,
                    'stock_before' => $stock,
                    'stock_after' => (float) $item->stock,
                    'reason' => $movement->reason,
                ],
            );

            return $movement->refresh();
        });
    }

    /**
     * Void a movement by inserting its opposite; history is never deleted.
     */
    public function voidMovement(InventoryMovement $movement, User $user, string $reason): InventoryMovement
    {
        return DB::transaction(function () use ($movement, $user, $reason): InventoryMovement {
            $movement = InventoryMovement::query()->lockForUpdate()->findOrFail((int) $movement->getKey());

            if ($movement->voided_at !== null) {
                throw ValidationException::withMessages([
                    'movement' => 'El movimiento ya está anulado.',
                ]);
            }

            if ($movement->isReversal()) {
                throw ValidationException::withMessages([
                    'movement' => 'Un movimiento de reverso no se puede anular.',
                ]);
            }

            if ($movement->reversals()->exists()) {
                throw ValidationException::withMessages([
                    'movement' => 'El movimiento ya tiene un reverso registrado.',
                ]);
            }

            $reason = trim($reason);

            if ($reason === '') {
                throw ValidationException::withMessages([
                    'reason' => 'Indica el motivo de la anulación.',
                ]);
            }

            $item = InventoryItem::query()->lockForUpdate()->findOrFail($movement->inventory_item_id);
            $stock = (float) $item->stock;
            $delta = round(-1 * (float) $movement->quantity, 2);
            $newStock = round($stock + $delta, 2);

            if ($newStock < -0.005) {
                throw ValidationException::withMessages([
                    'movement' => 'No se puede anular: el stock quedaría en negativo ('.number_format($stock, 2).' disponibles).',
                ]);
            }

            $reversalType = match ($movement->type) {
                InventoryMovement::ENTRADA => InventoryMovement::SALIDA,
                InventoryMovement::SALIDA => InventoryMovement::ENTRADA,
                default => InventoryMovement::AJUSTE,
            };

            $reversal = InventoryMovement::create([
                'inventory_item_id' => $item->id,
                'type' => $reversalType,
                'quantity' => $delta,
                'unit_cost' => $movement->unit_cost,
                'reason' => Str::limit("Reverso del movimiento #{$movement->id}: {$reason}", 250),
                'reference' => $movement->reference,
                'occurred_at' => now($this->timezone())->toDateString(),
                'created_by' => $user->id,
                'reversal_of_id' => $movement->id,
            ]);

            $item->forceFill(['stock' => max(0, $newStock)])->save();

            $movement->forceFill([
                'voided_by' => $user->id,
                'voided_at' => now(),
                'void_reason' => $reason,
            ])->save();

            $this->audit->record(
                module: 'inventory',
                action: 'movement_voided',
                subject: $movement,
                description: "Movimiento #{$movement->id} anulado para {$item->name}",
                changes: [
                    'item_id' => $item->id,
                    'type' => $movement->type,
                    'quantity' => (float) $movement->quantity,
                    'reversal_id' => $reversal->id,
                    'stock_before' => $stock,
                    'stock_after' => (float) $item->stock,
                    'reason' => $reason,
                ],
            );

            return $movement->refresh();
        });
    }

    private function normalizeSku(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = trim($value);

        return $value === '' ? null : mb_strtoupper(mb_substr($value, 0, 60));
    }

    private function normalizeKey(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = trim($value);

        return $value === '' ? null : mb_substr($value, 0, 64);
    }

    private function cleanReason(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = trim($value);

        return $value === '' ? null : mb_substr($value, 0, 250);
    }

    private function timezone(): string
    {
        return app(CurrentHotel::class)->timezone();
    }
}
