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

    public function requests(): HasMany
    {
        return $this->hasMany(ServiceRequest::class);
    }
}
