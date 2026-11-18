<?php

use App\Models\Area;
use App\Models\Bill;
use App\Models\Branch;
use App\Models\Building;
use App\Models\Calendar;
use App\Models\Client;
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

it('paginates clients and preserves the search in the pagination links', function () {
    foreach (range(1, 12) as $index) {
        Client::create([
            'first_name' => 'Huésped',
            'last_name' => 'Pagina '.$index,
            'cedula' => sprintf('410%08d', $index),
            'address' => 'Calle '.$index,
            'phone_number' => '8090000000',
        ]);
    }

    $this->actingAs($this->user)
        ->get('/clients?search=Pagina')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Clients/Index')
            ->has('clients.data', 10)
            ->where('clients.total', 12)
            ->where('clients.per_page', 10)
            ->where('clients.last_page', 2)
            ->where('filters.search', 'Pagina')
            ->where('clients.next_page_url', fn ($url) => is_string($url) && str_contains($url, 'search=Pagina')));
});

it('filters clients by active status', function () {
    Client::create([
        'first_name' => 'Inactivo',
        'last_name' => 'Cliente',
        'cedula' => '40200000002',
        'address' => 'Calle 2',
        'phone_number' => '8092223333',
        'active' => false,
    ]);

    $this->actingAs($this->user)
        ->get('/clients?status=0')
        ->assertInertia(fn ($page) => $page
            ->has('clients.data', 1)
            ->where('clients.data.0.first_name', 'Inactivo')
            ->where('filters.status', '0'));
});

it('filters reservations by state and active status', function () {
    foreach (['Pendiente', 'Confirmada', 'Confirmada'] as $index => $status) {
        Reservation::create([
            'client_id' => $this->client->id,
            'room_id' => $this->room->id,
            'reserved_at' => '2026-12-0'.($index + 1).' 10:00:00',
            'guests' => 1,
            'user_id' => $this->user->id,
            'status' => $status,
        ]);
    }

    // The state matches, but the record is inactive: status=1 must exclude it.
    Reservation::create([
        'client_id' => $this->client->id,
        'room_id' => $this->room->id,
        'reserved_at' => '2026-12-04 10:00:00',
        'guests' => 1,
        'user_id' => $this->user->id,
        'status' => 'Confirmada',
        'active' => false,
    ]);

    $this->actingAs($this->user)
        ->get('/reservations?state=Confirmada&status=1')
        ->assertInertia(fn ($page) => $page
            ->has('reservations.data', 2)
            ->where('filters.state', 'Confirmada')
            ->where('filters.status', '1'));

    $this->actingAs($this->user)
        ->get('/reservations?state=Nope')
        ->assertInertia(fn ($page) => $page->has('reservations.data', 4));
});

it('filters bills by state and searches by number', function () {
    foreach (['FAC-100' => 'Pagada', 'FAC-200' => 'Pendiente', 'FAC-300' => 'Anulada'] as $number => $status) {
        Bill::create([
            'client_id' => $this->client->id,
            'number' => $number,
            'issued_at' => '2026-12-01',
            'subtotal' => 100,
            'tax' => 0,
            'total' => 100,
            'status' => $status,
        ]);
    }

    $this->actingAs($this->user)
        ->get('/bills?state=Pagada')
        ->assertInertia(fn ($page) => $page
            ->has('bills.data', 1)
            ->where('bills.data.0.number', 'FAC-100')
            ->where('filters.state', 'Pagada'));

    $this->actingAs($this->user)
        ->get('/bills?search=FAC-300')
        ->assertInertia(fn ($page) => $page
            ->has('bills.data', 1)
            ->where('bills.data.0.status', 'Anulada')
            ->where('filters.search', 'FAC-300'));
});

it('filters calendar events by type', function () {
    Calendar::create([
        'title' => 'Evento general',
        'type' => 'evento',
        'starts_at' => '2026-12-01 10:00:00',
    ]);

    Calendar::create([
        'title' => 'Bloqueo de mantenimiento',
        'type' => 'bloqueo',
        'starts_at' => '2026-12-02 10:00:00',
    ]);

    $this->actingAs($this->user)
        ->get('/calendars?type=bloqueo')
        ->assertInertia(fn ($page) => $page
            ->has('events.data', 1)
            ->where('events.data.0.title', 'Bloqueo de mantenimiento')
            ->where('filters.type', 'bloqueo'));
});

it('paginates buildings and filters them by status', function () {
    foreach (range(1, 12) as $index) {
        Building::create([
            'name' => 'Edificio '.$index,
            'floors' => 1,
        ]);
    }

    Building::create([
        'name' => 'Edificio cerrado',
        'floors' => 1,
        'active' => false,
    ]);

    $this->actingAs($this->user)
        ->get('/buildings')
        ->assertInertia(fn ($page) => $page
            ->has('buildings.data', 10)
            ->where('buildings.total', 13));

    $this->actingAs($this->user)
        ->get('/buildings?status=0')
        ->assertInertia(fn ($page) => $page
            ->has('buildings.data', 1)
            ->where('buildings.data.0.name', 'Edificio cerrado'));
});

it('paginates branches and filters them by status', function () {
    foreach (range(1, 12) as $index) {
        Branch::create([
            'name' => 'Sucursal '.$index,
            'description' => '',
            'phone_number' => '8090000000',
        ]);
    }

    $closed = Branch::create([
        'name' => 'Sucursal cerrada',
        'description' => '',
        'phone_number' => '8090000001',
    ]);
    $closed->update(['status' => false]);

    $this->actingAs($this->user)
        ->get('/branches')
        ->assertInertia(fn ($page) => $page
            ->has('branches.data', 10)
            ->where('branches.total', 13));

    $this->actingAs($this->user)
        ->get('/branches?status=0')
        ->assertInertia(fn ($page) => $page
            ->has('branches.data', 1)
            ->where('branches.data.0.name', 'Sucursal cerrada'));
});
