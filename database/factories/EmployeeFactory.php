<?php

namespace Database\Factories;

use App\Models\Employee;
use Database\Factories\Concerns\ResolvesHotel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Employee>
 */
class EmployeeFactory extends Factory
{
    use ResolvesHotel;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'hotel_id' => fn (): int => $this->hotelId(),
            'user_id' => null,
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'cedula' => fake()->unique()->numerify('0##########'),
            'birth_date' => fake()->dateTimeBetween('-55 years', '-20 years'),
            'phone' => fake()->phoneNumber(),
            'email' => fake()->unique()->safeEmail(),
            'address' => fake()->address(),
            'position' => fake()->jobTitle(),
            'department' => fake()->randomElement(Employee::DEPARTMENTS),
            'hire_date' => fake()->dateTimeBetween('-8 years', '-1 month'),
            'status' => Employee::ACTIVO,
            'salary' => fake()->numberBetween(15000, 90000),
            'bank_account' => fake()->numerify('###-#######-#'),
            'emergency_contact_name' => fake()->name(),
            'emergency_contact_phone' => fake()->phoneNumber(),
            'notes' => fake()->optional()->sentence(),
        ];
    }

    public function onLeave(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => Employee::LICENCIA,
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => Employee::INACTIVO,
        ]);
    }
}
