<?php

namespace Database\Factories;

use App\Models\BillDetail;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BillDetail>
 */
class BillDetailFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'bill_id' => BillFactory::new(),
            'description' => fake()->sentence(3),
            'quantity' => fake()->numberBetween(1, 4),
            'unit_price' => fake()->numberBetween(300, 5000),
            'subtotal' => fn (array $attributes): float => round(
                ((int) ($attributes['quantity'] ?? 1)) * ((float) ($attributes['unit_price'] ?? 0)),
                2,
            ),
        ];
    }
}
