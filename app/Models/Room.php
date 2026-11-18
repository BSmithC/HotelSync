<?php

namespace App\Models;

use App\Models\Concerns\BelongsToHotel;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property int $id
 * @property int $hotel_id
 * @property string $name
 * @property int $capacity
 * @property string|null $category
 * @property int $bed_count
 * @property array<int, string>|null $amenities
 * @property int $area_id
 * @property string $shape
 * @property int|null $pos_y
 * @property int|null $pos_x
 * @property int|null $width
 * @property int|null $height
 * @property int|null $rotation
 * @property bool $active
 * @property string|null $description
 * @property string|null $price
 * @property string|null $phone
 * @property string $status
 */
class Room extends Model
{
    use BelongsToHotel;

    protected $fillable = [
        'hotel_id',
        'name',
        'capacity',
        'category',
        'bed_count',
        'amenities',
        'area_id',
        'shape',
        'pos_y',
        'pos_x',
        'width',
        'height',
        'rotation',
        'active',
        'description',
        'price',
        'phone',
        'status',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'bed_count' => 'integer',
            'amenities' => 'array',
            'price' => 'decimal:2',
        ];
    }

    /**
     * @return BelongsTo<Area, $this>
     */
    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    /**
     * @return HasMany<Reservation, $this>
     */
    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }

    /**
     * @return HasMany<RoomStatusLog, $this>
     */
    public function statusLogs(): HasMany
    {
        return $this->hasMany(RoomStatusLog::class);
    }

    /**
     * @return HasMany<RoomAssignment, $this>
     */
    public function assignments(): HasMany
    {
        return $this->hasMany(RoomAssignment::class, 'to_room_id');
    }

    /**
     * @return HasMany<Incident, $this>
     */
    public function incidents(): HasMany
    {
        return $this->hasMany(Incident::class);
    }

    /**
     * Reservation currently hosting guests in this room.
     *
     * A plain ordered `hasOne` keeps the eager load simple; `latestOfMany()`
     * creates a self-join whose `room_id` is ambiguous on SQLite.
     *
     * @return HasOne<Reservation, $this>
     */
    public function currentReservation(): HasOne
    {
        return $this->hasOne(Reservation::class)
            ->where('reservations.status', 'En curso')
            ->where('reservations.active', true)
            ->orderByDesc('reservations.checked_in_at')
            ->orderByDesc('reservations.id');
    }

    /**
     * Whether the room can receive a guest.
     */
    public function isAvailable(): bool
    {
        return $this->active && $this->status === 'disponible';
    }
}
