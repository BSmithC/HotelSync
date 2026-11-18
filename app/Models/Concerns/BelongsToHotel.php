<?php

namespace App\Models\Concerns;

use App\Models\Hotel;
use App\Support\CurrentHotel;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Scopes a model to the hotel (tenant) of the current request.
 *
 * - Reads are automatically filtered by hotel_id.
 * - New records inherit the current hotel_id when none is provided.
 */
trait BelongsToHotel
{
    public static function bootBelongsToHotel(): void
    {
        static::addGlobalScope('hotel', function (Builder $builder): void {
            $hotelId = app(CurrentHotel::class)->id();

            if ($hotelId !== null) {
                $builder->where($builder->getModel()->getTable().'.hotel_id', $hotelId);
            }
        });

        static::creating(function (Model $model): void {
            if ($model->getAttribute('hotel_id') === null) {
                $model->setAttribute('hotel_id', app(CurrentHotel::class)->id());
            }
        });
    }

    public function hotel(): BelongsTo
    {
        return $this->belongsTo(Hotel::class);
    }
}
