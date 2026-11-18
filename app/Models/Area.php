<?php

namespace App\Models;

use App\Models\Concerns\BelongsToHotel;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int|null $hotel_id
 * @property string $name
 * @property int $x
 * @property int $y
 * @property int $width
 * @property int $height
 */
class Area extends Model
{
    use BelongsToHotel;

    protected $fillable = [
        'hotel_id',
        'name',
        'x',
        'y',
        'width',
        'height',
    ];
}
