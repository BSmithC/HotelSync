<?php

namespace Database\Factories;

use App\Models\Incident;
use Database\Factories\Concerns\ResolvesHotel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Incident>
 */
class IncidentFactory extends Factory
{
    use ResolvesHotel;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'hotel_id' => fn (): int => $this->hotelId(),
            'reservation_id' => null,
            'room_id' => RoomFactory::new(),
            'type' => fake()->randomElement(Incident::TYPES),
            'severity' => fake()->randomElement(Incident::SEVERITIES),
            'title' => fake()->sentence(4),
            'description' => fake()->paragraph(),
            'status' => 'abierta',
            'reported_by' => UserFactory::new(),
            'resolved_by' => null,
            'resolved_at' => null,
            'resolution' => null,
        ];
    }

    public function resolved(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => 'resuelta',
            'resolved_at' => now(),
            'resolution' => 'Incidencia resuelta para demostración.',
        ]);
    }
}
