<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Reservation extends Model
{
    protected $fillable = [
        'client_id',
        'room_id',
        'reserved_at',
        'guests',
        'notes',
        'finished_at',
        'user_id',
        'status',
        'active',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }
    public function rooms()
    {
        return $this->hasMany(Room::class);
    }
}
