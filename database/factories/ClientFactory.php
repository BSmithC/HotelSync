<?php

namespace Database\Factories;

use App\Models\Client;
use Database\Factories\Concerns\ResolvesHotel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Client>
 */
class ClientFactory extends Factory
{
    use ResolvesHotel;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'hotel_id' => fn (): int => $this->hotelId(),
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'cedula' => fake()->unique()->numerify('9##########'),
            'rnc' => null,
            'address' => fake()->address(),
            'phone_number' => fake()->phoneNumber(),
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
