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
 *
 * @property int $id
 * @property int $hotel_id
 * @property int $service_id
 * @property int|null $client_id
 * @property int|null $reservation_id
 * @property int|null $bill_id
 * @property int|null $bill_detail_id
 * @property string $status
 * @property int $quantity
 * @property string $unit_price
 * @property string $total
 * @property \Carbon\CarbonImmutable $requested_at
 * @property \Carbon\CarbonImmutable|null $completed_at
 * @property \Carbon\CarbonImmutable|null $billed_at
 * @property string|null $notes
 * @property string|null $idempotency_key
 * @property int|null $created_by
 * @property int|null $billed_by
 * @property int|null $voided_by
 * @property \Carbon\CarbonImmutable|null $voided_at
 * @property string|null $void_reason
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

    /**
     * @return BelongsTo<Service, $this>
     */
    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    /**
     * @return BelongsTo<Client, $this>
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /**
     * @return BelongsTo<Reservation, $this>
     */
    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    /**
     * @return BelongsTo<Bill, $this>
     */
    public function bill(): BelongsTo
    {
        return $this->belongsTo(Bill::class);
    }

    /**
     * @return BelongsTo<BillDetail, $this>
     */
    public function billDetail(): BelongsTo
    {
        return $this->belongsTo(BillDetail::class);
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
    public function billedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'billed_by');
    }

    /**
     * @return BelongsTo<User, $this>
     */
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
