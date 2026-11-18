<?php

namespace App\Models;

use App\Models\Concerns\BelongsToHotel;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function reservation(): BelongsTo
    {
        return $this->belongsTo(Reservation::class);
    }
}
