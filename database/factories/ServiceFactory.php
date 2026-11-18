<?php

namespace Database\Factories;

use App\Models\Service;
use Database\Factories\Concerns\ResolvesHotel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Service>
 */
class ServiceFactory extends Factory
{
    use ResolvesHotel;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'hotel_id' => fn (): int => $this->hotelId(),
            'name' => ucfirst(fake()->unique()->word()),
            'category' => fake()->randomElement(Service::CATEGORIES),
            'description' => fake()->sentence(),
            'price' => fake()->numberBetween(300, 5000),
            'active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes): array => [
            'active' => false,
        ]);
    }
}
