<?php

namespace App\Models;

use App\Models\Concerns\BelongsToHotel;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Operational incident reported by reception or housekeeping.
 *
 * @property int $id
 * @property int $hotel_id
 * @property int|null $reservation_id
 * @property int|null $room_id
 * @property string $type
 * @property string $severity
 * @property string $title
 * @property string $description
 * @property string $status
 * @property int|null $reported_by
 * @property int|null $resolved_by
 * @property CarbonImmutable|null $resolved_at
 * @property string|null $resolution
 */
class Incident extends Model
{
    use BelongsToHotel;

    /**
     * @var list<string>
     */
    public const TYPES = ['mantenimiento', 'limpieza', 'huesped', 'seguridad', 'otro'];

    /**
     * @var list<string>
     */
    public const SEVERITIES = ['baja', 'media', 'alta'];

    /**
     * @var list<string>
     */
    public const STATUSES = ['abierta', 'en_proceso', 'resuelta'];

    protected $fillable = [
        'hotel_id',
        'reservation_id',
        'room_id',
        'type',
        'severity',
        'title',
        'description',
        'status',
        'reported_by',
        'resolved_by',
        'resolved_at',
        'resolution',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'resolved_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Reservation, $this>
     */
    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    /**
     * @return BelongsTo<Room, $this>
     */
    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function reportedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function resolvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    public function isOpen(): bool
    {
        return $this->status !== 'resuelta';
    }
}
