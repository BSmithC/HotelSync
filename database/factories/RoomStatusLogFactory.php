<?php

namespace Database\Factories;

use App\Models\RoomStatusLog;
use Database\Factories\Concerns\ResolvesHotel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RoomStatusLog>
 */
class RoomStatusLogFactory extends Factory
{
    use ResolvesHotel;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'hotel_id' => fn (): int => $this->hotelId(),
            'room_id' => RoomFactory::new(),
            'previous_status' => 'disponible',
            'status' => 'ocupada',
            'reservation_id' => null,
            'changed_by' => UserFactory::new(),
            'reason' => 'Cambio de estado',
        ];
    }
}
