<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Bed extends Model
{
    protected $fillable = [
        'area_id',
        'name',
        'capacity',
        'pos_x',
        'shape',
        'pos_y',
        'width',
        'height',
        'rotation',
        'active',
    ];

    public function area()
    {
        return $this->belongsTo(Area::class);
    }
}
