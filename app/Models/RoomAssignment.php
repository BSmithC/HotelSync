<?php

namespace App\Models;

use App\Models\Concerns\BelongsToHotel;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Room change history: every check-in or transfer leaves a trace.
 *
 * @property int $id
 * @property int $hotel_id
 * @property int $reservation_id
 * @property int|null $from_room_id
 * @property int $to_room_id
 * @property int|null $assigned_by
 * @property CarbonImmutable $assigned_at
 * @property string|null $reason
 */
class RoomAssignment extends Model
{
    use BelongsToHotel;

    protected $fillable = [
        'hotel_id',
        'reservation_id',
        'from_room_id',
        'to_room_id',
        'assigned_by',
        'assigned_at',
        'reason',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'assigned_at' => 'datetime',
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
    public function fromRoom(): BelongsTo
    {
        return $this->belongsTo(Room::class, 'from_room_id');
    }

    /**
     * @return BelongsTo<Room, $this>
     */
    public function toRoom(): BelongsTo
    {
        return $this->belongsTo(Room::class, 'to_room_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }
}
