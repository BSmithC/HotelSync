<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RoomDetail extends Model
{
    protected $fillable = [
        'types',
        'price',
    ];

    public function room()
    {
        return $this->belongsTo(Room::class);
    }
}
