<?php

use App\Models\Area;
use App\Models\AuditLog;
use App\Models\Client;
use App\Models\Hotel;
use App\Models\Incident;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\RoomAssignment;
use App\Models\RoomStatusLog;
use App\Models\User;
use App\Support\CurrentHotel;

beforeEach(function () {
    $this->hotel = useCurrentHotel();
    $this->user = User::factory()->create();

    $this->area = Area::create([
        'name' => 'Planta baja',
        'x' => 0,
        'y' => 0,
        'width' => 800,
        'height' => 600,
    ]);
});

/**
 * Attaches a user to the given hotel with a single role.
 */
function receptionActor(Hotel $hotel, string $role): User
{
    $user = User::factory()->create();
    $user->hotels()->sync([$hotel->id => ['role' => $role]]);

    return $user;
}

function receptionClient(Hotel $hotel, string $lastName = 'Pérez'): Client
{
    return Client::create([
        'hotel_id' => $hotel->id,
        'first_name' => 'Ana',
        'last_name' => $lastName,
        'cedula' => fake()->unique()->numerify('###########'),
        'address' => 'Av. Independencia 10',
        'phone_number' => '8091112222',
    ]);
}

function receptionRoom(
    Hotel $hotel,
    Area $area,
    string $name,
    string $status = 'disponible',
    array $attributes = [],
): Room {
    return Room::create([
        'hotel_id' => $hotel->id,
        'name' => $name,
        'capacity' => 2,
        'shape' => 'rectangle',
        'area_id' => $area->id,
        'status' => $status,
        'active' => true,
        ...$attributes,
    ]);
}

function receptionReservation(
    Hotel $hotel,
    User $user,
    Client $client,
    Room $room,
    string $status = 'Confirmada',
    array $attributes = [],
): Reservation {
    return Reservation::create([
        'hotel_id' => $hotel->id,
        'client_id' => $client->id,
        'room_id' => $room->id,
        'reserved_at' => now(),
        'guests' => 2,
        'user_id' => $user->id,
        'status' => $status,
        'active' => true,
        ...$attributes,
    ]);
}

it('redirects guests to the login screen', function () {
    $this->get('/reception')->assertRedirect('/login');
});

it('forbids roles without the reception permission', function () {
    $finance = receptionActor($this->hotel, 'finanzas');

    $this->actingAs($finance)->get('/reception')->assertForbidden();

    $reception = receptionActor($this->hotel, 'recepcion');

    $this->actingAs($reception)->get('/reception')->assertOk();
});

it('renders the reception dashboard with operational indicators', function () {
    $available = receptionRoom($this->hotel, $this->area, '101');
    $occupied = receptionRoom($this->hotel, $this->area, '102', 'ocupada');
    $client = receptionClient($this->hotel);

    receptionReservation($this->hotel, $this->user, $client, $available, 'Confirmada');

    $inHouse = receptionReservation($this->hotel, $this->user, $client, $occupied, 'En curso', [
        'checked_in_at' => now(),
        'checked_in_by' => $this->user->id,
        'finished_at' => now(),
    ]);

    $this->actingAs($this->user)
        ->get('/reception')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Reception/Index')
            ->where('kpis.arrivals', 2)
            ->where('kpis.pendingArrivals', 1)
            ->where('kpis.departures', 1)
            ->where('kpis.inHouse', 1)
            ->where('kpis.availableRooms', 1)
            ->where('kpis.occupiedRooms', 1)
            ->where('roomCounts.disponible', 1)
            ->where('roomCounts.ocupada', 1)
            ->where('permissions.operate', true)
            ->has('arrivals.data', 2)
            ->has('departures.data', 1)
            ->has('inHouse.data', 1)
            ->has('rooms.data', 2)
            ->where('inHouse.data.0.id', $inHouse->id));
});

it('registers a check-in and occupies the assigned room', function () {
    $room = receptionRoom($this->hotel, $this->area, '101');
    $client = receptionClient($this->hotel);
    $reservation = receptionReservation($this->hotel, $this->user, $client, $room);

    $this->actingAs($this->user)
        ->post("/reception/reservations/{$reservation->id}/check-in")
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $reservation->refresh();

    expect($reservation->status)->toBe('En curso')
        ->and($reservation->checked_in_at)->not->toBeNull()
        ->and($reservation->checked_in_by)->toBe($this->user->id)
        ->and($room->fresh()->status)->toBe('ocupada');

    expect(RoomStatusLog::query()
        ->where('room_id', $room->id)
        ->where('status', 'ocupada')
        ->where('reservation_id', $reservation->id)
        ->exists())->toBeTrue();

    expect(AuditLog::query()
        ->where('module', 'reception')
        ->where('action', 'check_in')
        ->where('subject_id', $reservation->id)
        ->exists())->toBeTrue();
});

it('rejects a check-in for an inactive or already started reservation', function () {
    $room = receptionRoom($this->hotel, $this->area, '101');
    $client = receptionClient($this->hotel);

    $inactive = receptionReservation($this->hotel, $this->user, $client, $room, 'Confirmada', [
        'active' => false,
    ]);

    $this->actingAs($this->user)
        ->post("/reception/reservations/{$inactive->id}/check-in")
        ->assertSessionHasErrors('reservation');

    $started = receptionReservation($this->hotel, $this->user, $client, $room, 'En curso', [
        'checked_in_at' => now(),
    ]);

    $this->actingAs($this->user)
        ->post("/reception/reservations/{$started->id}/check-in")
        ->assertSessionHasErrors('reservation');
});

it('rejects a check-in into a room occupied by another guest', function () {
    $roomA = receptionRoom($this->hotel, $this->area, '101');
    $roomB = receptionRoom($this->hotel, $this->area, '102', 'ocupada');
    $client = receptionClient($this->hotel);

    receptionReservation($this->hotel, $this->user, $client, $roomB, 'En curso', [
        'checked_in_at' => now(),
    ]);

    $arrival = receptionReservation($this->hotel, $this->user, $client, $roomA);

    $this->actingAs($this->user)
        ->post("/reception/reservations/{$arrival->id}/check-in", ['room_id' => $roomB->id])
        ->assertSessionHasErrors('room_id');

    expect($arrival->fresh()->status)->toBe('Confirmada')
        ->and($arrival->fresh()->checked_in_at)->toBeNull();
});

it('rejects a check-in into a room pending cleaning', function () {
    $room = receptionRoom($this->hotel, $this->area, '101', 'limpieza');
    $client = receptionClient($this->hotel);
    $arrival = receptionReservation($this->hotel, $this->user, $client, $room);

    $this->actingAs($this->user)
        ->post("/reception/reservations/{$arrival->id}/check-in")
        ->assertSessionHasErrors('room_id');

    expect($arrival->fresh()->status)->toBe('Confirmada')
        ->and($room->fresh()->status)->toBe('limpieza');
});

it('releases a cleaned room back to available', function () {
    $room = receptionRoom($this->hotel, $this->area, '101', 'limpieza');

    $this->actingAs($this->user)
        ->patch("/reception/rooms/{$room->id}/status", [
            'status' => 'disponible',
            'reason' => 'Limpieza terminada',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    expect($room->fresh()->status)->toBe('disponible')
        ->and(RoomStatusLog::query()
            ->where('room_id', $room->id)
            ->where('status', 'disponible')
            ->exists())->toBeTrue();
});

it('does not expose reservations from another hotel', function () {
    $otherHotel = Hotel::factory()->create(['name' => 'Hotel Sur']);
    $otherArea = Area::create([
        'hotel_id' => $otherHotel->id,
        'name' => 'Planta baja',
        'x' => 0,
        'y' => 0,
        'width' => 800,
        'height' => 600,
    ]);

    app(CurrentHotel::class)->set($otherHotel->id);
    $otherRoom = receptionRoom($otherHotel, $otherArea, '201');
    $otherClient = receptionClient($otherHotel, 'Externa');
    $otherReservation = receptionReservation($otherHotel, $this->user, $otherClient, $otherRoom);

    app(CurrentHotel::class)->set($this->hotel->id);

    $this->actingAs($this->user)
        ->post("/reception/reservations/{$otherReservation->id}/check-in")
        ->assertNotFound();

    $this->actingAs($this->user)
        ->get("/reception/guests/{$otherClient->id}")
        ->assertNotFound();
});

it('registers a check-out and sends the room to housekeeping', function () {
    $room = receptionRoom($this->hotel, $this->area, '101', 'ocupada');
    $client = receptionClient($this->hotel);
    $reservation = receptionReservation($this->hotel, $this->user, $client, $room, 'En curso', [
        'checked_in_at' => now(),
        'checked_in_by' => $this->user->id,
    ]);

    $this->actingAs($this->user)
        ->post("/reception/reservations/{$reservation->id}/check-out")
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $reservation->refresh();

    expect($reservation->status)->toBe('Finalizada')
        ->and($reservation->checked_out_at)->not->toBeNull()
        ->and($reservation->checked_out_by)->toBe($this->user->id)
        ->and($room->fresh()->status)->toBe('limpieza');

    expect(AuditLog::query()
        ->where('module', 'reception')
        ->where('action', 'check_out')
        ->where('subject_id', $reservation->id)
        ->exists())->toBeTrue();
});

it('rejects a check-out when the guest is not in house', function () {
    $room = receptionRoom($this->hotel, $this->area, '101');
    $client = receptionClient($this->hotel);
    $reservation = receptionReservation($this->hotel, $this->user, $client, $room, 'Confirmada');

    $this->actingAs($this->user)
        ->post("/reception/reservations/{$reservation->id}/check-out")
        ->assertSessionHasErrors('reservation');

    expect($reservation->fresh()->status)->toBe('Confirmada');
});

it('moves an in-house guest to another room and logs the assignment', function () {
    $origin = receptionRoom($this->hotel, $this->area, '101', 'ocupada');
    $destination = receptionRoom($this->hotel, $this->area, '102');
    $client = receptionClient($this->hotel);

    $reservation = receptionReservation($this->hotel, $this->user, $client, $origin, 'En curso', [
        'checked_in_at' => now(),
    ]);

    $this->actingAs($this->user)
        ->patch("/reception/reservations/{$reservation->id}/room", [
            'room_id' => $destination->id,
            'reason' => 'Solicitud del huésped',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $reservation->refresh();

    expect($reservation->room_id)->toBe($destination->id)
        ->and($origin->fresh()->status)->toBe('limpieza')
        ->and($destination->fresh()->status)->toBe('ocupada');

    $assignment = RoomAssignment::query()->where('reservation_id', $reservation->id)->firstOrFail();

    expect($assignment->from_room_id)->toBe($origin->id)
        ->and($assignment->to_room_id)->toBe($destination->id)
        ->and($assignment->reason)->toBe('Solicitud del huésped');

    expect(AuditLog::query()
        ->where('module', 'reception')
        ->where('action', 'room_changed')
        ->where('subject_id', $reservation->id)
        ->exists())->toBeTrue();
});

it('rejects a room change into an occupied or maintenance room', function () {
    $origin = receptionRoom($this->hotel, $this->area, '101', 'ocupada');
    $occupied = receptionRoom($this->hotel, $this->area, '102', 'ocupada');
    $maintenance = receptionRoom($this->hotel, $this->area, '103', 'mantenimiento');
    $client = receptionClient($this->hotel);

    $reservation = receptionReservation($this->hotel, $this->user, $client, $origin, 'En curso', [
        'checked_in_at' => now(),
    ]);

    $this->actingAs($this->user)
        ->patch("/reception/reservations/{$reservation->id}/room", ['room_id' => $occupied->id])
        ->assertSessionHasErrors('room_id');

    $this->actingAs($this->user)
        ->patch("/reception/reservations/{$reservation->id}/room", ['room_id' => $maintenance->id])
        ->assertSessionHasErrors('room_id');

    expect($reservation->fresh()->room_id)->toBe($origin->id);
});

it('updates a free room status and records the trace', function () {
    $room = receptionRoom($this->hotel, $this->area, '101');

    $this->actingAs($this->user)
        ->patch("/reception/rooms/{$room->id}/status", [
            'status' => 'mantenimiento',
            'reason' => 'Limpieza profunda',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    expect($room->fresh()->status)->toBe('mantenimiento');

    $log = RoomStatusLog::query()->where('room_id', $room->id)->latest('id')->firstOrFail();

    expect($log->previous_status)->toBe('disponible')
        ->and($log->status)->toBe('mantenimiento')
        ->and($log->reason)->toBe('Limpieza profunda');

    expect(AuditLog::query()
        ->where('module', 'reception')
        ->where('action', 'room_status_changed')
        ->where('subject_id', $room->id)
        ->exists())->toBeTrue();
});

it('rejects manual room statuses that contradict the guest state', function () {
    $free = receptionRoom($this->hotel, $this->area, '101');

    $this->actingAs($this->user)
        ->patch("/reception/rooms/{$free->id}/status", ['status' => 'ocupada'])
        ->assertSessionHasErrors('status');

    $occupied = receptionRoom($this->hotel, $this->area, '102', 'ocupada');
    $client = receptionClient($this->hotel);

    receptionReservation($this->hotel, $this->user, $client, $occupied, 'En curso', [
        'checked_in_at' => now(),
    ]);

    $this->actingAs($this->user)
        ->patch("/reception/rooms/{$occupied->id}/status", ['status' => 'disponible'])
        ->assertSessionHasErrors('status');

    expect($occupied->fresh()->status)->toBe('ocupada');
});

it('creates an incident linked to the reservation and its room', function () {
    $room = receptionRoom($this->hotel, $this->area, '101', 'ocupada');
    $client = receptionClient($this->hotel);
    $reservation = receptionReservation($this->hotel, $this->user, $client, $room, 'En curso', [
        'checked_in_at' => now(),
    ]);

    $this->actingAs($this->user)
        ->post('/reception/incidents', [
            'reservation_id' => $reservation->id,
            'type' => 'mantenimiento',
            'severity' => 'alta',
            'title' => 'Aire acondicionado sin funcionar',
            'description' => 'El huésped reporta que el aire no enfría.',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $incident = Incident::query()->firstOrFail();

    expect($incident->status)->toBe('abierta')
        ->and($incident->room_id)->toBe($room->id)
        ->and($incident->reservation_id)->toBe($reservation->id)
        ->and($incident->reported_by)->toBe($this->user->id);

    expect(AuditLog::query()
        ->where('module', 'reception')
        ->where('action', 'incident_created')
        ->where('subject_id', $incident->id)
        ->exists())->toBeTrue();
});

it('advances an incident through its workflow and requires a resolution', function () {
    $incident = Incident::create([
        'hotel_id' => $this->hotel->id,
        'type' => 'limpieza',
        'severity' => 'media',
        'title' => 'Habitación sin limpiar',
        'description' => 'La habitación no fue limpiada antes de la llegada.',
        'status' => 'abierta',
        'reported_by' => $this->user->id,
    ]);

    $this->actingAs($this->user)
        ->patch("/reception/incidents/{$incident->id}", ['status' => 'en_proceso'])
        ->assertSessionHasNoErrors();

    expect($incident->fresh()->status)->toBe('en_proceso');

    $this->actingAs($this->user)
        ->patch("/reception/incidents/{$incident->id}", ['status' => 'resuelta'])
        ->assertSessionHasErrors('resolution');

    $this->actingAs($this->user)
        ->patch("/reception/incidents/{$incident->id}", [
            'status' => 'resuelta',
            'resolution' => 'Se envió al equipo de limpieza.',
        ])
        ->assertSessionHasNoErrors();

    $incident->refresh();

    expect($incident->status)->toBe('resuelta')
        ->and($incident->resolved_by)->toBe($this->user->id)
        ->and($incident->resolved_at)->not->toBeNull();
});

it('rejects invalid incident transitions', function () {
    $incident = Incident::create([
        'hotel_id' => $this->hotel->id,
        'type' => 'otro',
        'severity' => 'baja',
        'title' => 'Incidencia cerrada',
        'description' => 'Ya fue atendida.',
        'status' => 'resuelta',
        'reported_by' => $this->user->id,
        'resolution' => 'Atendida',
        'resolved_at' => now(),
    ]);

    $this->actingAs($this->user)
        ->patch("/reception/incidents/{$incident->id}", ['status' => 'en_proceso'])
        ->assertSessionHasErrors('status');

    expect($incident->fresh()->status)->toBe('resuelta');
});

it('shows the guest stay history only inside the current hotel', function () {
    $room = receptionRoom($this->hotel, $this->area, '101');
    $client = receptionClient($this->hotel);

    receptionReservation($this->hotel, $this->user, $client, $room, 'Finalizada', [
        'checked_in_at' => now()->subDays(2),
        'checked_out_at' => now()->subDay(),
    ]);

    $this->actingAs($this->user)
        ->get("/reception/guests/{$client->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Reception/Guest')
            ->where('client.id', $client->id)
            ->where('stats.stays', 1)
            ->where('stats.completed', 1)
            ->where('stats.inHouse', false)
            ->has('reservations.data', 1));
});

it('records the acting user in reception audit entries', function () {
    $room = receptionRoom($this->hotel, $this->area, '101');
    $client = receptionClient($this->hotel);
    $reception = receptionActor($this->hotel, 'recepcion');

    $reservation = receptionReservation($this->hotel, $this->user, $client, $room);

    $this->actingAs($reception)
        ->post("/reception/reservations/{$reservation->id}/check-in")
        ->assertSessionHasNoErrors();

    $log = AuditLog::query()
        ->where('module', 'reception')
        ->where('action', 'check_in')
        ->where('subject_id', $reservation->id)
        ->firstOrFail();

    expect($log->user_id)->toBe($reception->id)
        ->and($log->hotel_id)->toBe($this->hotel->id);
});

it('forbids reception operations for roles without the ability', function () {
    $room = receptionRoom($this->hotel, $this->area, '101');
    $client = receptionClient($this->hotel);
    $reservation = receptionReservation($this->hotel, $this->user, $client, $room);
    $finance = receptionActor($this->hotel, 'finanzas');

    $this->actingAs($finance)
        ->post("/reception/reservations/{$reservation->id}/check-in")
        ->assertForbidden();

    $this->actingAs($finance)
        ->post('/reception/incidents', [
            'type' => 'otro',
            'severity' => 'baja',
            'title' => 'Sin permiso',
            'description' => 'No debería registrarse.',
        ])
        ->assertForbidden();

    expect($reservation->fresh()->status)->toBe('Confirmada')
        ->and(Incident::query()->count())->toBe(0);
});
