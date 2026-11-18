<?php

namespace Database\Factories;

use App\Models\InventoryItem;
use Database\Factories\Concerns\ResolvesHotel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<InventoryItem>
 */
class InventoryItemFactory extends Factory
{
    use ResolvesHotel;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'hotel_id' => fn (): int => $this->hotelId(),
            'name' => fake()->unique()->words(2, true),
            'sku' => 'SKU-'.fake()->unique()->numerify('#####'),
            'category' => fake()->randomElement(InventoryItem::CATEGORIES),
            'unit' => fake()->randomElement(InventoryItem::UNITS),
            'min_stock' => fake()->numberBetween(5, 30),
            'unit_cost' => fake()->numberBetween(50, 2500),
            'stock' => 0,
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
