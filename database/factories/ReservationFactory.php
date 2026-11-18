<?php

namespace Database\Factories;

use App\Models\Reservation;
use Database\Factories\Concerns\ResolvesHotel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Reservation>
 */
class ReservationFactory extends Factory
{
    use ResolvesHotel;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $arrival = fake()->dateTimeBetween('-1 month', '+1 month');

        return [
            'hotel_id' => fn (): int => $this->hotelId(),
            'client_id' => ClientFactory::new(),
            'room_id' => RoomFactory::new(),
            'reserved_at' => $arrival,
            'finished_at' => (clone $arrival)->modify('+2 days'),
            'guests' => fake()->numberBetween(1, 4),
            'notes' => fake()->optional()->sentence(),
            'user_id' => UserFactory::new(),
            'status' => 'Pendiente',
            'active' => true,
        ];
    }

    public function confirmed(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => 'Confirmada',
        ]);
    }

    public function inHouse(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => 'En curso',
            'checked_in_at' => now()->subDay(),
        ]);
    }

    public function finished(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => 'Finalizada',
            'checked_in_at' => now()->subWeek(),
            'checked_out_at' => now()->subWeek()->addDays(2),
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => 'Cancelada',
            'active' => false,
        ]);
    }
}
