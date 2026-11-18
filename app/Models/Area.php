<?php

namespace App\Models;

use App\Models\Concerns\BelongsToHotel;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int|null $hotel_id
 * @property int|null $building_id
 * @property string $name
 * @property string $type
 * @property string|null $color
 * @property int|null $floor
 * @property bool $active
 * @property int $x
 * @property int $y
 * @property int $width
 * @property int $height
 * @property-read Building|null $building
 */
class Area extends Model
{
    use BelongsToHotel;

    protected $fillable = [
        'hotel_id',
        'building_id',
        'name',
        'type',
        'color',
        'floor',
        'active',
        'x',
        'y',
        'width',
        'height',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'floor' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Building, $this>
     */
    public function building(): BelongsTo
    {
        return $this->belongsTo(Building::class);
    }
}
