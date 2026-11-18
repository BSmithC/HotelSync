<?php

namespace Database\Factories;

use App\Models\FinanceMovement;
use Database\Factories\Concerns\ResolvesHotel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FinanceMovement>
 */
class FinanceMovementFactory extends Factory
{
    use ResolvesHotel;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'hotel_id' => fn (): int => $this->hotelId(),
            'direction' => FinanceMovement::INGRESO,
            'amount' => fake()->numberBetween(500, 15000),
            'description' => fake()->sentence(4),
            'source_type' => null,
            'source_id' => null,
            'occurred_at' => fake()->dateTimeBetween('-3 months', 'now'),
            'reversal_of_id' => null,
            'created_by' => UserFactory::new(),
        ];
    }

    public function expense(): static
    {
        return $this->state(fn (array $attributes): array => [
            'direction' => FinanceMovement::EGRESO,
        ]);
    }
}
