<?php

namespace Database\Factories;

use App\Models\ServiceRequest;
use Database\Factories\Concerns\ResolvesHotel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ServiceRequest>
 */
class ServiceRequestFactory extends Factory
{
    use ResolvesHotel;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'hotel_id' => fn (): int => $this->hotelId(),
            'service_id' => ServiceFactory::new(),
            'client_id' => ClientFactory::new(),
            'reservation_id' => null,
            'bill_id' => null,
            'bill_detail_id' => null,
            'status' => ServiceRequest::PENDIENTE,
            'quantity' => fake()->numberBetween(1, 3),
            'unit_price' => fake()->numberBetween(300, 5000),
            'total' => fn (array $attributes): float => round(
                ((int) ($attributes['quantity'] ?? 1)) * ((float) ($attributes['unit_price'] ?? 0)),
                2,
            ),
            'requested_at' => fake()->dateTimeBetween('-1 month', 'now'),
            'notes' => fake()->optional()->sentence(),
            'created_by' => UserFactory::new(),
        ];
    }

    public function completed(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => ServiceRequest::COMPLETADO,
            'completed_at' => now()->toDateString(),
        ]);
    }

    public function billed(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => ServiceRequest::FACTURADO,
            'completed_at' => now()->toDateString(),
            'billed_at' => now(),
        ]);
    }

    public function voided(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => ServiceRequest::ANULADO,
            'voided_at' => now(),
            'void_reason' => 'Solicitud anulada para demostración.',
        ]);
    }
}
