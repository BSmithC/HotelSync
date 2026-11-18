<?php

namespace Database\Factories;

use App\Models\Area;
use Database\Factories\Concerns\ResolvesHotel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Area>
 */
class AreaFactory extends Factory
{
    use ResolvesHotel;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'hotel_id' => fn (): int => $this->hotelId(),
            'name' => 'Zona '.fake()->unique()->word(),
            'type' => 'zona',
            'color' => null,
            'floor' => null,
            'active' => true,
            'x' => fake()->numberBetween(0, 800),
            'y' => fake()->numberBetween(0, 800),
            'width' => fake()->numberBetween(200, 800),
            'height' => fake()->numberBetween(200, 800),
        ];
    }
}
