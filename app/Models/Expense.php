<?php

namespace App\Models;

use App\Models\Concerns\BelongsToHotel;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

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

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function voidedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'voided_by');
    }

    public function movements(): MorphMany
    {
        return $this->morphMany(FinanceMovement::class, 'source');
    }
}
