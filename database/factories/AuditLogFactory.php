<?php

namespace Database\Factories;

use App\Models\AuditLog;
use Database\Factories\Concerns\ResolvesHotel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AuditLog>
 */
class AuditLogFactory extends Factory
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
            'module' => 'sistema',
            'action' => 'demo_event',
            'subject_type' => null,
            'subject_id' => null,
            'description' => fake()->sentence(6),
            'changes' => null,
            'ip' => null,
        ];
    }

    public function forModule(string $module): static
    {
        return $this->state(fn (array $attributes): array => [
            'module' => $module,
        ]);
    }
}
