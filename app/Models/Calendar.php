<?php

namespace App\Models;

use App\Models\Concerns\BelongsToHotel;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int|null $hotel_id
 * @property int|null $room_id
 * @property int|null $reservation_id
 * @property string $title
 * @property string|null $description
 * @property CarbonImmutable|null $starts_at
 * @property CarbonImmutable|null $ends_at
 * @property string $type
 * @property bool $active
 */
class Calendar extends Model
{
    use BelongsToHotel;

    /**
     * The migration creates the singular "calendar" table.
     *
     * @var string
     */
    protected $table = 'calendar';

    protected $fillable = [
        'hotel_id',
        'room_id',
        'reservation_id',
        'title',
        'description',
        'starts_at',
        'ends_at',
        'type',
        'active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'active' => 'boolean',
        ];
    }

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
}
