<?php

namespace Database\Factories;

use App\Models\Bill;
use Database\Factories\Concerns\ResolvesHotel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Bill>
 */
class BillFactory extends Factory
{
    use ResolvesHotel;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $subtotal = (float) fake()->numberBetween(500, 25000);

        return [
            'hotel_id' => fn (): int => $this->hotelId(),
            'client_id' => ClientFactory::new(),
            'reservation_id' => null,
            'number' => 'FAC-'.fake()->unique()->numerify('######'),
            'issued_at' => fake()->dateTimeBetween('-3 months', 'now'),
            'subtotal' => $subtotal,
            'tax' => 0,
            'total' => $subtotal,
            'status' => 'Pendiente',
            'notes' => fake()->optional()->sentence(),
            'active' => true,
        ];
    }

    public function paid(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => 'Pagada',
        ]);
    }

    public function voided(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => 'Anulada',
            'active' => false,
            'voided_at' => now(),
            'void_reason' => 'Factura anulada para demostración.',
        ]);
    }
}
