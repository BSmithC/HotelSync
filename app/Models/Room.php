<?php

namespace App\Models;

use App\Models\Concerns\BelongsToHotel;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Room extends Model
{
    use BelongsToHotel;

    protected $fillable = [
        'hotel_id',
        'name',
        'capacity',
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
            'price' => 'decimal:2',
        ];
    }

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }

    public function statusLogs(): HasMany
    {
        return $this->hasMany(RoomStatusLog::class);
    }

    /**
     * Reservation currently hosting guests in this room.
     *
     * A plain ordered `hasOne` keeps the eager load simple; `latestOfMany()`
     * creates a self-join whose `room_id` is ambiguous on SQLite.
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
