<?php

namespace App\Models;

use App\Models\Concerns\BelongsToHotel;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 *
 * @property int $id
 * @property int $hotel_id
 * @property string $category
 * @property string $description
 * @property string $amount
 * @property \Carbon\CarbonImmutable $expense_date
 * @property string $method
 * @property string|null $reference
 * @property string|null $supplier
 * @property string $status
 * @property string|null $idempotency_key
 * @property int|null $created_by
 * @property int|null $voided_by
 * @property \Carbon\CarbonImmutable|null $voided_at
 * @property string|null $void_reason
 */
class Expense extends Model
{
    use BelongsToHotel;

    /**
     * Expense buckets used by the register form and reports.
     *
     * @var list<string>
     */
    public const CATEGORIES = [
        'operativo',
        'mantenimiento',
        'suministros',
        'personal',
        'servicios_basicos',
        'marketing',
        'impuestos',
        'otro',
    ];

    /**
     * @var list<string>
     */
    public const METHODS = Payment::METHODS;

    /**
     * @var list<string>
     */
    public const STATUSES = ['registrado', 'anulado'];

    protected $fillable = [
        'hotel_id',
        'category',
        'description',
        'amount',
        'expense_date',
        'method',
        'reference',
        'supplier',
        'status',
        'idempotency_key',
        'created_by',
        'voided_by',
        'voided_at',
        'void_reason',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'expense_date' => 'date',
            'voided_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function voidedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'voided_by');
    }

    /**
     * @return MorphMany<FinanceMovement, $this>
     */
    public function movements(): MorphMany
    {
        return $this->morphMany(FinanceMovement::class, 'source');
    }
}
