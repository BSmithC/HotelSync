<?php

namespace Database\Factories;

use App\Models\Building;
use Database\Factories\Concerns\ResolvesHotel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Building>
 */
class BuildingFactory extends Factory
{
    use ResolvesHotel;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'hotel_id' => fn (): int => $this->hotelId(),
            'branch_id' => BranchFactory::new(),
            'name' => 'Edificio '.fake()->unique()->word(),
            'address' => fake()->address(),
            'floors' => fake()->numberBetween(1, 8),
            'description' => fake()->sentence(),
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
