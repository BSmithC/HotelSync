<?php

namespace App\Models;

use App\Models\Concerns\BelongsToHotel;
use Illuminate\Database\Eloquent\Model;

class Bed extends Model
{
    use BelongsToHotel;

    protected $fillable = [
        'hotel_id',
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
