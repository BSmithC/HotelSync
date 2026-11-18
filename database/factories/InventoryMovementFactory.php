<?php

namespace Database\Factories;

use App\Models\InventoryMovement;
use Database\Factories\Concerns\ResolvesHotel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<InventoryMovement>
 */
class InventoryMovementFactory extends Factory
{
    use ResolvesHotel;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'hotel_id' => fn (): int => $this->hotelId(),
            'inventory_item_id' => InventoryItemFactory::new(),
            'type' => InventoryMovement::ENTRADA,
            'quantity' => fake()->numberBetween(5, 50),
            'unit_cost' => fake()->numberBetween(50, 2500),
            'reason' => 'Compra de suministros',
            'reference' => fake()->optional()->bothify('INV-####'),
            'occurred_at' => fake()->dateTimeBetween('-3 months', 'now'),
            'created_by' => UserFactory::new(),
        ];
    }

    public function exit(): static
    {
        return $this->state(fn (array $attributes): array => [
            'type' => InventoryMovement::SALIDA,
            'quantity' => -1 * abs((int) ($attributes['quantity'] ?? 10)),
        ]);
    }

    public function adjustment(): static
    {
        return $this->state(fn (array $attributes): array => [
            'type' => InventoryMovement::AJUSTE,
        ]);
    }
}
