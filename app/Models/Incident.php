<?php

namespace App\Models;

use App\Models\Concerns\BelongsToHotel;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Operational incident reported by reception or housekeeping.
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

    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function reportedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    public function resolvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    public function isOpen(): bool
    {
        return $this->status !== 'resuelta';
    }
}
