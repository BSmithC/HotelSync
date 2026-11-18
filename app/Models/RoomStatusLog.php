<?php

namespace App\Models;

use App\Models\Concerns\BelongsToHotel;
use App\Support\RoomStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Append-only log of room status changes.
 *
 * Rooms keep their current status column for fast reads, while this table
 * preserves the history used by reception and reports.
 *
 * @property int $id
 * @property int $hotel_id
 * @property int $room_id
 * @property string|null $previous_status
 * @property string $status
 * @property int|null $reservation_id
 * @property int|null $changed_by
 * @property string|null $reason
 */
class RoomStatusLog extends Model
{
    use BelongsToHotel;

    /**
     * @var list<string>
     */
    public const STATUSES = RoomStatus::ALL;

    protected $fillable = [
        'hotel_id',
        'room_id',
        'previous_status',
        'status',
        'reservation_id',
        'changed_by',
        'reason',
    ];

    /**
     * @return BelongsTo<Room, $this>
     */
    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    /**
     * @return BelongsTo<Reservation, $this>
     */
    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
