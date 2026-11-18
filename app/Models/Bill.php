<?php

namespace App\Models;

use App\Models\Concerns\BelongsToHotel;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Bill extends Model
{
    use BelongsToHotel;

    protected $fillable = [
        'hotel_id',
        'client_id',
        'reservation_id',
        'number',
        'issued_at',
        'subtotal',
        'tax',
        'total',
        'status',
        'notes',
        'active',
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
            'issued_at' => 'date',
            'subtotal' => 'decimal:2',
            'tax' => 'decimal:2',
            'total' => 'decimal:2',
            'active' => 'boolean',
            'voided_at' => 'datetime',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    public function details(): HasMany
    {
        return $this->hasMany(BillDetail::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function voidedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'voided_by');
    }

    /**
     * Amount collected through registered (not voided) payments.
     */
    public function paidTotal(): float
    {
        return round((float) $this->payments()
            ->where('status', 'registrado')
            ->sum('amount'), 2);
    }

    /**
     * Amount still owed for this invoice.
     */
    public function balance(): float
    {
        return round((float) $this->total - $this->paidTotal(), 2);
    }
}
