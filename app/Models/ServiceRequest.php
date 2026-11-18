<?php

namespace App\Models;

use App\Models\Concerns\BelongsToHotel;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A request for a hotel service, from reception to its invoice line.
 *
 * Lifecycle: pendiente → en_proceso → completado → facturado. A request that
 * never reached the invoice can be anulado; once facturado the invoice governs
 * and the request keeps its link for traceability.
 */
class ServiceRequest extends Model
{
    use BelongsToHotel;

    public const PENDIENTE = 'pendiente';

    public const EN_PROCESO = 'en_proceso';

    public const COMPLETADO = 'completado';

    public const FACTURADO = 'facturado';

    public const ANULADO = 'anulado';

    /**
     * @var list<string>
     */
    public const STATUSES = [
        self::PENDIENTE,
        self::EN_PROCESO,
        self::COMPLETADO,
        self::FACTURADO,
        self::ANULADO,
    ];

    /**
     * Statuses that can still be moved forward or cancelled.
     *
     * @var list<string>
     */
    public const OPEN_STATUSES = [self::PENDIENTE, self::EN_PROCESO];

    protected $fillable = [
        'hotel_id',
        'service_id',
        'client_id',
        'reservation_id',
        'bill_id',
        'bill_detail_id',
        'status',
        'quantity',
        'unit_price',
        'total',
        'requested_at',
        'completed_at',
        'billed_at',
        'notes',
        'idempotency_key',
        'created_by',
        'billed_by',
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
            'quantity' => 'integer',
            'unit_price' => 'decimal:2',
            'total' => 'decimal:2',
            'requested_at' => 'date',
            'completed_at' => 'date',
            'billed_at' => 'datetime',
            'voided_at' => 'datetime',
        ];
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    public function bill(): BelongsTo
    {
        return $this->belongsTo(Bill::class);
    }

    public function billDetail(): BelongsTo
    {
        return $this->belongsTo(BillDetail::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function billedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'billed_by');
    }

    public function voidedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'voided_by');
    }

    public function isOpen(): bool
    {
        return in_array($this->status, self::OPEN_STATUSES, true);
    }

    public function isBillable(): bool
    {
        return $this->status === self::COMPLETADO;
    }
}
