<?php

namespace App\Models;

use App\Models\Concerns\BelongsToHotel;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $hotel_id
 * @property int $client_id
 * @property int $room_id
 * @property CarbonImmutable $reserved_at
 * @property int $guests
 * @property string|null $notes
 * @property CarbonImmutable|null $finished_at
 * @property CarbonImmutable|null $checked_in_at
 * @property CarbonImmutable|null $checked_out_at
 * @property int|null $checked_in_by
 * @property int|null $checked_out_by
 * @property int $user_id
 * @property string $status
 * @property bool $active
 */
class Reservation extends Model
{
    use BelongsToHotel;

    protected $fillable = [
        'hotel_id',
        'client_id',
        'room_id',
        'reserved_at',
        'guests',
        'notes',
        'finished_at',
        'checked_in_at',
        'checked_out_at',
        'checked_in_by',
        'checked_out_by',
        'user_id',
        'status',
        'active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'reserved_at' => 'datetime',
            'finished_at' => 'datetime',
            'checked_in_at' => 'datetime',
            'checked_out_at' => 'datetime',
            'active' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Client, $this>
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
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
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return HasMany<Bill, $this>
     */
    public function bills(): HasMany
    {
        return $this->hasMany(Bill::class);
    }

    /**
     * @return HasMany<Calendar, $this>
     */
    public function calendarEvents(): HasMany
    {
        return $this->hasMany(Calendar::class);
    }

    /**
     * @return HasMany<RoomAssignment, $this>
     */
    public function assignments(): HasMany
    {
        return $this->hasMany(RoomAssignment::class);
    }

    /**
     * @return HasMany<Incident, $this>
     */
    public function incidents(): HasMany
    {
        return $this->hasMany(Incident::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function checkedInBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'checked_in_by');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function checkedOutBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'checked_out_by');
    }

    /**
     * Whether the reservation is currently hosting guests.
     */
    public function isInHouse(): bool
    {
        return $this->status === 'En curso' && $this->active;
    }

    /**
     * Whether the guest can still be checked in.
     */
    public function canCheckIn(): bool
    {
        return $this->active
            && $this->checked_in_at === null
            && in_array($this->status, ['Pendiente', 'Confirmada'], true);
    }
}
