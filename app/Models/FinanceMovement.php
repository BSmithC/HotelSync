<?php

namespace App\Models;

use App\Models\Concerns\BelongsToHotel;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * Append-only cash ledger.
 *
 * Rows are never updated or deleted. Voiding a payment or an expense inserts
 * an opposite movement that references the original one through
 * `reversal_of_id`, so every balance can be rebuilt without losing history.
 *
 * @property int $id
 * @property int $hotel_id
 * @property string $direction
 * @property string $amount
 * @property string $description
 * @property string|null $source_type
 * @property int|null $source_id
 * @property \Carbon\CarbonImmutable $occurred_at
 * @property int|null $reversal_of_id
 * @property int|null $created_by
 */
class FinanceMovement extends Model
{
    use BelongsToHotel;

    public const INGRESO = 'ingreso';

    public const EGRESO = 'egreso';

    /**
     * @var list<string>
     */
    public const DIRECTIONS = [self::INGRESO, self::EGRESO];

    protected $fillable = [
        'hotel_id',
        'direction',
        'amount',
        'description',
        'source_type',
        'source_id',
        'occurred_at',
        'reversal_of_id',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'occurred_at' => 'datetime',
        ];
    }

    /**
     * @return MorphTo<Model, $this>
     */
    public function source(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * @return BelongsTo<FinanceMovement, $this>
     */
    public function reversalOf(): BelongsTo
    {
        return $this->belongsTo(self::class, 'reversal_of_id');
    }

    /**
     * @return HasMany<FinanceMovement, $this>
     */
    public function reversals(): HasMany
    {
        return $this->hasMany(self::class, 'reversal_of_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
