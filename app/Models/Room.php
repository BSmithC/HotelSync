<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Room extends Model
{
    protected $fillable = [
        'client_id',
        'room_number',
        'description',
        'active',
    ];

    public function details()
    {
        return $this->hasMany(RoomDetail::class);
    }
    public function client()
    {
        return $this->belongsTo(Client::class);
    }
}
