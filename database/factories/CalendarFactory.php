<?php

namespace Database\Factories;

use App\Models\Calendar;
use Database\Factories\Concerns\ResolvesHotel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Calendar>
 */
class CalendarFactory extends Factory
{
    use ResolvesHotel;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $startsAt = fake()->dateTimeBetween('-1 week', '+1 month');

        return [
            'hotel_id' => fn (): int => $this->hotelId(),
            'room_id' => RoomFactory::new(),
            'reservation_id' => null,
            'title' => fake()->sentence(4),
            'description' => fake()->sentence(),
            'starts_at' => $startsAt,
            'ends_at' => (clone $startsAt)->modify('+2 hours'),
            'type' => 'evento',
            'active' => true,
        ];
    }

    public function maintenance(): static
    {
        return $this->state(fn (array $attributes): array => [
            'type' => 'mantenimiento',
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes): array => [
            'active' => false,
        ]);
    }
}
