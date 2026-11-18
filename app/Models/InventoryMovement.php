<?php

namespace App\Models;

use App\Models\Concerns\BelongsToHotel;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Append-only stock ledger.
 *
 * `quantity` is the signed delta applied to the item balance. Movements are
 * never updated or deleted: voiding inserts the opposite movement and keeps
 * a reference to the original through `reversal_of_id`.
 */
class InventoryMovement extends Model
{
    use BelongsToHotel;

    public const ENTRADA = 'entrada';

    public const SALIDA = 'salida';

    public const AJUSTE = 'ajuste';

    /**
     * @var list<string>
     */
    public const TYPES = [self::ENTRADA, self::SALIDA, self::AJUSTE];

    protected $fillable = [
        'hotel_id',
        'inventory_item_id',
        'type',
        'quantity',
        'unit_cost',
        'reason',
        'reference',
        'occurred_at',
        'idempotency_key',
        'created_by',
        'voided_by',
        'voided_at',
        'void_reason',
        'reversal_of_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:2',
            'unit_cost' => 'decimal:2',
            'occurred_at' => 'date',
            'voided_at' => 'datetime',
        ];
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class, 'inventory_item_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function voidedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'voided_by');
    }

    public function reversalOf(): BelongsTo
    {
        return $this->belongsTo(self::class, 'reversal_of_id');
    }

    public function reversals(): HasMany
    {
        return $this->hasMany(self::class, 'reversal_of_id');
    }

    public function isReversal(): bool
    {
        return $this->reversal_of_id !== null;
    }
}
