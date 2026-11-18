<?php

use App\Models\Area;
use App\Models\Bill;
use App\Models\Branch;
use App\Models\Building;
use App\Models\Calendar;
use App\Models\Client;
use App\Models\Hotel;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\User;

beforeEach(function () {
    $this->hotel = useCurrentHotel();
    $this->user = User::factory()->create();

    $area = Area::create([
        'name' => 'Planta baja',
        'x' => 0,
        'y' => 0,
        'width' => 800,
        'height' => 600,
    ]);

    $this->room = Room::create([
        'name' => 'Suite 101',
        'capacity' => 2,
        'shape' => 'rectangle',
        'area_id' => $area->id,
    ]);

    $this->client = Client::create([
        'first_name' => 'Ana',
        'last_name' => 'Pérez',
        'cedula' => '40200000001',
        'address' => 'Av. Independencia 10',
        'phone_number' => '8091112222',
    ]);
});

it('creates a reservation linked to a client and a room', function () {
    $this->actingAs($this->user)
        ->post('/reservations', [
            'client_id' => $this->client->id,
            'room_id' => $this->room->id,
            'reserved_at' => '2026-12-01 14:00:00',
            'guests' => 2,
            'status' => 'Confirmada',
        ])
        ->assertRedirect('/reservations');

    $reservation = Reservation::firstOrFail();

    expect($reservation->client_id)->toBe($this->client->id)
        ->and($reservation->room_id)->toBe($this->room->id)
        ->and($reservation->user_id)->toBe($this->user->id)
        ->and($reservation->status)->toBe('Confirmada');

    $this->actingAs($this->user)
        ->get('/reservations')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Reservations/Index')
            ->has('reservations.data', 1));
});

it('deactivates and restores a reservation', function () {
    $reservation = Reservation::create([
        'client_id' => $this->client->id,
        'room_id' => $this->room->id,
        'reserved_at' => '2026-12-02 10:00:00',
        'guests' => 1,
        'user_id' => $this->user->id,
        'status' => 'Pendiente',
    ]);

    $this->actingAs($this->user)
        ->delete("/reservations/{$reservation->id}")
        ->assertRedirect('/reservations');

    expect($reservation->fresh()->active)->toBeFalse();

    $this->actingAs($this->user)
        ->patch("/reservations/{$reservation->id}/restore")
        ->assertRedirect('/reservations');

    expect($reservation->fresh()->active)->toBeTrue();
});

it('creates a bill with the total calculated from subtotal and tax', function () {
    $this->actingAs($this->user)
        ->post('/bills', [
            'client_id' => $this->client->id,
            'number' => 'FAC-0001',
            'issued_at' => '2026-12-01',
            'subtotal' => 100,
            'tax' => 18,
            'status' => 'Pendiente',
        ])
        ->assertRedirect('/bills');

    $bill = Bill::firstOrFail();

    expect((float) $bill->subtotal)->toBe(100.0)
        ->and((float) $bill->tax)->toBe(18.0)
        ->and((float) $bill->total)->toBe(118.0)
        ->and($bill->client_id)->toBe($this->client->id);

    $this->actingAs($this->user)
        ->get('/bills')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Bills/Index')
            ->has('bills.data', 1));
});

it('creates a building linked to a branch', function () {
    $branch = Branch::create([
        'name' => 'Sucursal Centro',
        'description' => 'Zona centro',
        'phone_number' => '8090000000',
    ]);

    $this->actingAs($this->user)
        ->post('/buildings', [
            'name' => 'Edificio A',
            'branch_id' => $branch->id,
            'floors' => 3,
            'address' => 'Calle Duarte 10',
        ])
        ->assertRedirect('/buildings');

    $building = Building::firstOrFail();

    expect($building->name)->toBe('Edificio A')
        ->and($building->branch_id)->toBe($branch->id)
        ->and($building->floors)->toBe(3);
});

it('creates a calendar event linked to a room and a reservation', function () {
    $reservation = Reservation::create([
        'client_id' => $this->client->id,
        'room_id' => $this->room->id,
        'reserved_at' => '2026-12-03 12:00:00',
        'guests' => 2,
        'user_id' => $this->user->id,
        'status' => 'Confirmada',
    ]);

    $this->actingAs($this->user)
        ->post('/calendars', [
            'title' => 'Mantenimiento del aire',
            'type' => 'mantenimiento',
            'room_id' => $this->room->id,
            'reservation_id' => $reservation->id,
            'starts_at' => '2026-12-03 15:00:00',
        ])
        ->assertRedirect('/calendars');

    $event = Calendar::firstOrFail();

    expect($event->title)->toBe('Mantenimiento del aire')
        ->and($event->room_id)->toBe($this->room->id)
        ->and($event->reservation_id)->toBe($reservation->id);

    $this->actingAs($this->user)
        ->get('/calendars')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Calendar/Index')
            ->has('events.data', 1));
});

it('keeps reservations, bills, buildings and events isolated between hotels', function () {
    $other = Hotel::factory()->create(['name' => 'Hotel Sur']);

    $otherClient = Client::create([
        'hotel_id' => $other->id,
        'first_name' => 'Sur',
        'last_name' => 'Cliente',
        'cedula' => '40200000002',
        'address' => 'Calle Sur 1',
        'phone_number' => '8090000000',
    ]);

    $otherArea = Area::create([
        'hotel_id' => $other->id,
        'name' => 'Sur PB',
        'x' => 0,
        'y' => 0,
        'width' => 800,
        'height' => 600,
    ]);

    $otherRoom = Room::create([
        'hotel_id' => $other->id,
        'name' => 'S-101',
        'capacity' => 2,
        'shape' => 'rectangle',
        'area_id' => $otherArea->id,
    ]);

    $otherReservation = Reservation::create([
        'hotel_id' => $other->id,
        'client_id' => $otherClient->id,
        'room_id' => $otherRoom->id,
        'reserved_at' => '2026-12-04 10:00:00',
        'guests' => 1,
        'user_id' => $this->user->id,
        'status' => 'Pendiente',
    ]);

    $otherBill = Bill::create([
        'hotel_id' => $other->id,
        'client_id' => $otherClient->id,
        'number' => 'FAC-SUR-1',
        'issued_at' => '2026-12-04',
        'subtotal' => 50,
        'tax' => 0,
        'total' => 50,
        'status' => 'Pendiente',
    ]);

    $otherBuilding = Building::create([
        'hotel_id' => $other->id,
        'name' => 'Edificio Sur',
        'floors' => 1,
    ]);

    $otherEvent = Calendar::create([
        'hotel_id' => $other->id,
        'title' => 'Bloqueo Sur',
        'type' => 'bloqueo',
        'starts_at' => '2026-12-04 10:00:00',
    ]);

    $this->actingAs($this->user)->get("/reservations/{$otherReservation->id}")->assertNotFound();
    $this->actingAs($this->user)->get("/bills/{$otherBill->id}")->assertNotFound();
    $this->actingAs($this->user)->get("/buildings/{$otherBuilding->id}")->assertNotFound();
    $this->actingAs($this->user)->get("/calendars/{$otherEvent->id}")->assertNotFound();

    $this->actingAs($this->user)
        ->get('/reservations')
        ->assertInertia(fn ($page) => $page->has('reservations.data', 0));

    $this->actingAs($this->user)
        ->get('/bills')
        ->assertInertia(fn ($page) => $page->has('bills.data', 0));

    $this->actingAs($this->user)
        ->get('/buildings')
        ->assertInertia(fn ($page) => $page->has('buildings.data', 0));

    $this->actingAs($this->user)
        ->get('/calendars')
        ->assertInertia(fn ($page) => $page->has('events.data', 0));
});

it('rejects a client from another hotel when creating a reservation', function () {
    $other = Hotel::factory()->create(['name' => 'Hotel Sur']);

    $otherClient = Client::create([
        'hotel_id' => $other->id,
        'first_name' => 'Sur',
        'last_name' => 'Cliente',
        'cedula' => '40200000003',
        'address' => 'Calle Sur 1',
        'phone_number' => '8090000000',
    ]);

    $this->actingAs($this->user)
        ->post('/reservations', [
            'client_id' => $otherClient->id,
            'room_id' => $this->room->id,
            'reserved_at' => '2026-12-05 10:00:00',
            'guests' => 1,
            'status' => 'Pendiente',
        ])
        ->assertSessionHasErrors('client_id');

    expect(Reservation::withoutGlobalScope('hotel')->count())->toBe(0);
});
