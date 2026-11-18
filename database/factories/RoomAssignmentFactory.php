<?php

namespace Database\Factories;

use App\Models\RoomAssignment;
use Database\Factories\Concerns\ResolvesHotel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RoomAssignment>
 */
class RoomAssignmentFactory extends Factory
{
    use ResolvesHotel;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'hotel_id' => fn (): int => $this->hotelId(),
            'reservation_id' => ReservationFactory::new(),
            'from_room_id' => null,
            'to_room_id' => RoomFactory::new(),
            'assigned_by' => UserFactory::new(),
            'assigned_at' => now(),
            'reason' => 'Asignación de habitación',
        ];
    }
}
