<?php

namespace App\Models;

use App\Models\Concerns\BelongsToHotel;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int|null $hotel_id
 * @property int|null $branch_id
 * @property string $name
 * @property string|null $address
 * @property int $floors
 * @property string|null $description
 * @property bool $active
 */
class Building extends Model
{
    use BelongsToHotel;

    protected $fillable = [
        'hotel_id',
        'branch_id',
        'name',
        'address',
        'floors',
        'description',
        'active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'floors' => 'integer',
            'active' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Branch, $this>
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }
}
