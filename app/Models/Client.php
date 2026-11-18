<?php

namespace App\Models;

use App\Models\Concerns\BelongsToHotel;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 *
 * @property int $id
 * @property int|null $hotel_id
 * @property string $first_name
 * @property string $last_name
 * @property string|null $cedula
 * @property string|null $rnc
 * @property string $address
 * @property string $phone_number
 * @property bool $active
 */
class Client extends Model
{
    use BelongsToHotel;

    protected $fillable = [
        'hotel_id',
        'first_name',
        'last_name',
        'cedula',
        'rnc',
        'address',
        'phone_number',
        'active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'active' => 'boolean',
        ];
    }

    /**
     * @return HasMany<Reservation, $this>
     */
    public function reservations(): HasMany
    {
        return $this->hasMany(Reservation::class);
    }
}
