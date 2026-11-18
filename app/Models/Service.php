<?php

namespace App\Models;

use App\Models\Concerns\BelongsToHotel;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A sellable service of the hotel (restaurant, spa, laundry, transport…).
 *
 * Services are never hard-deleted by the application: they are deactivated so
 * historical requests keep their reference and price.
 *
 * @property int $id
 * @property int $hotel_id
 * @property string $name
 * @property string $category
 * @property string|null $description
 * @property string $price
 * @property bool $active
 */
class Service extends Model
{
    use BelongsToHotel;

    /**
     * @var list<string>
     */
    public const CATEGORIES = [
        'restaurante',
        'bar',
        'spa',
        'lavanderia',
        'transporte',
        'tour',
        'room_service',
        'otro',
    ];

    protected $fillable = [
        'hotel_id',
        'name',
        'category',
        'description',
        'price',
        'active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'active' => 'boolean',
        ];
    }

    /**
     * @return HasMany<ServiceRequest, $this>
     */
    public function requests(): HasMany
    {
        return $this->hasMany(ServiceRequest::class);
    }
}
