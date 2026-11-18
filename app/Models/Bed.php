<?php

namespace App\Models;

use App\Models\Concerns\BelongsToHotel;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 *
 * @property int $id
 * @property int|null $hotel_id
 * @property int $area_id
 * @property string $name
 * @property int $capacity
 * @property int|null $pos_x
 * @property string $shape
 * @property int|null $pos_y
 * @property int|null $width
 * @property int|null $height
 * @property int|null $rotation
 * @property bool $active
 */
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

    /**
     * @return BelongsTo<Area, $this>
     */
    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }
}
