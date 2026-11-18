<?php

namespace App\Models;

use App\Models\Concerns\BelongsToHotel;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Payment extends Model
{
    use BelongsToHotel;

    /**
     * Payment methods accepted by the register form.
     *
     * @var list<string>
     */
    public const METHODS = ['efectivo', 'tarjeta', 'transferencia', 'cheque', 'otro'];

    /**
     * Lifecycle: registered payments count as collected; voided ones do not.
     *
     * @var list<string>
     */
    public const STATUSES = ['registrado', 'anulado'];

    protected $fillable = [
        'hotel_id',
        'bill_id',
        'client_id',
        'method',
        'amount',
        'paid_at',
        'reference',
        'notes',
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
            'paid_at' => 'date',
            'voided_at' => 'datetime',
        ];
    }

    public function bill(): BelongsTo
    {
        return $this->belongsTo(Bill::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
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
