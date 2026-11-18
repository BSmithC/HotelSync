<?php

namespace App\Models;

use App\Models\Concerns\BelongsToHotel;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Append-only log of room status changes.
 *
 * Rooms keep their current status column for fast reads, while this table
 * preserves the history used by reception and reports.
 */
class RoomStatusLog extends Model
{
    use BelongsToHotel;

    /**
     * @var list<string>
     */
    public const STATUSES = ['disponible', 'ocupada', 'reservada', 'mantenimiento'];

    protected $fillable = [
        'hotel_id',
        'room_id',
        'previous_status',
        'status',
        'reservation_id',
        'changed_by',
        'reason',
    ];

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
