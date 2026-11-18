<?php

namespace Database\Factories;

use App\Models\Bed;
use Database\Factories\Concerns\ResolvesHotel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Bed>
 */
class BedFactory extends Factory
{
    use ResolvesHotel;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'hotel_id' => fn (): int => $this->hotelId(),
            'area_id' => AreaFactory::new(),
            'name' => 'Cama '.fake()->unique()->numerify('##'),
            'capacity' => fake()->numberBetween(1, 2),
            'pos_x' => fake()->numberBetween(0, 600),
            'shape' => 'circle',
            'pos_y' => fake()->numberBetween(0, 600),
            'width' => 60,
            'height' => 60,
            'rotation' => 0,
            'active' => true,
        ];
    }
}
