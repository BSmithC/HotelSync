<?php

namespace Database\Factories;

use App\Models\Room;
use Database\Factories\Concerns\ResolvesHotel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Room>
 */
class RoomFactory extends Factory
{
    use ResolvesHotel;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'hotel_id' => fn (): int => $this->hotelId(),
            'name' => 'Habitación '.fake()->unique()->numerify('###'),
            'capacity' => fake()->numberBetween(1, 4),
            'category' => fake()->randomElement(['Estándar', 'Suite', 'Familiar']),
            'bed_count' => fake()->numberBetween(1, 2),
            'amenities' => ['Wi-Fi', 'Aire acondicionado', 'TV'],
            'area_id' => AreaFactory::new(),
            'shape' => 'rectangle',
            'pos_x' => fake()->numberBetween(0, 40),
            'pos_y' => fake()->numberBetween(0, 40),
            'width' => 120,
            'height' => 90,
            'rotation' => 0,
            'active' => true,
            'description' => fake()->sentence(),
            'price' => fake()->numberBetween(2500, 12000),
            'phone' => fake()->phoneNumber(),
            'status' => 'disponible',
        ];
    }

    public function maintenance(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => 'mantenimiento',
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes): array => [
            'active' => false,
        ]);
    }
}
