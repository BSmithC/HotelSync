<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Room extends Model
{
    protected $fillable = [
        'name',
        'capacity',
        'area_id',
        'shape',
        'pos_y',
        'width',
        'height',
        'rotation',
        'active',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }
    public function area()
    {
        return $this->belongsTo(Area::class);
    }
}
