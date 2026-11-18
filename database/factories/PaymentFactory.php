<?php

namespace Database\Factories;

use App\Models\Payment;
use Database\Factories\Concerns\ResolvesHotel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Payment>
 */
class PaymentFactory extends Factory
{
    use ResolvesHotel;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'hotel_id' => fn (): int => $this->hotelId(),
            'bill_id' => BillFactory::new(),
            'client_id' => null,
            'method' => fake()->randomElement(Payment::METHODS),
            'amount' => fake()->numberBetween(500, 8000),
            'paid_at' => fake()->dateTimeBetween('-2 months', 'now'),
            'reference' => fake()->optional()->bothify('REF-####'),
            'notes' => fake()->optional()->sentence(),
            'status' => 'registrado',
            'created_by' => UserFactory::new(),
        ];
    }

    public function voided(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => 'anulado',
            'voided_at' => now(),
            'void_reason' => 'Cobro anulado para demostración.',
        ]);
    }
}
