<?php

namespace Database\Factories;

use App\Models\Expense;
use App\Models\Payment;
use Database\Factories\Concerns\ResolvesHotel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Expense>
 */
class ExpenseFactory extends Factory
{
    use ResolvesHotel;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'hotel_id' => fn (): int => $this->hotelId(),
            'category' => fake()->randomElement(Expense::CATEGORIES),
            'description' => fake()->sentence(4),
            'amount' => fake()->numberBetween(500, 20000),
            'expense_date' => fake()->dateTimeBetween('-3 months', 'now'),
            'method' => fake()->randomElement(Payment::METHODS),
            'reference' => fake()->optional()->bothify('GAS-####'),
            'supplier' => fake()->optional()->company(),
            'status' => 'registrado',
            'created_by' => UserFactory::new(),
        ];
    }

    public function voided(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => 'anulado',
            'voided_at' => now(),
            'void_reason' => 'Gasto anulado para demostración.',
        ]);
    }
}
