<?php

namespace App\Models;

use App\Models\Concerns\BelongsToHotel;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

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

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function bills(): HasMany
    {
        return $this->hasMany(Bill::class);
    }

    public function calendarEvents(): HasMany
    {
        return $this->hasMany(Calendar::class);
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(RoomAssignment::class);
    }

    public function incidents(): HasMany
    {
        return $this->hasMany(Incident::class);
    }

    public function checkedInBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'checked_in_by');
    }

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
