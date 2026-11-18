<?php

namespace Database\Factories\Concerns;

use App\Models\Hotel;
use App\Support\CurrentHotel;

/**
 * Resolves the tenant of a factory-made record.
 *
 * The current hotel wins so tests and seeders can create data without
 * repeating the same `hotel_id` in every factory call. When there is no
 * request context, the first hotel keeps the fixtures usable.
 */
trait ResolvesHotel
{
    protected function hotelId(): int
    {
        $current = app(CurrentHotel::class)->id();

        if ($current !== null) {
            return $current;
        }

        $hotelId = Hotel::query()->orderBy('id')->value('id');

        if ($hotelId !== null) {
            return (int) $hotelId;
        }

        return (int) Hotel::factory()->create()->id;
    }
}
