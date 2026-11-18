<?php

use App\Models\Area;
use App\Models\Branch;
use App\Models\Client;
use App\Models\Hotel;
use App\Models\Room;
use App\Models\User;

function tenantHotel(string $name = 'Hotel Norte'): Hotel
{
    return Hotel::factory()->create(['name' => $name]);
}

function tenantUser(Hotel $hotel): User
{
    $user = User::factory()->create();

    // Keep only the requested hotel so the test cannot rely on the default tenant.
    $user->hotels()->sync([$hotel->id => ['role' => 'owner']]);

    return $user;
}

/**
 * @param  array<string, mixed>  $attributes
 */
function tenantClient(Hotel $hotel, array $attributes = []): Client
{
    return Client::create([
        'hotel_id' => $hotel->id,
        'first_name' => 'Cliente',
        'last_name' => 'De '.$hotel->name,
        'cedula' => fake()->unique()->numerify('###########'),
        'address' => 'Calle 1',
        'phone_number' => '8090000000',
        ...$attributes,
    ]);
}

/**
 * @param  array<string, mixed>  $attributes
 */
function tenantArea(Hotel $hotel, array $attributes = []): Area
{
    return Area::create([
        'hotel_id' => $hotel->id,
        'name' => 'Planta baja',
        'x' => 0,
        'y' => 0,
        'width' => 800,
        'height' => 600,
        ...$attributes,
    ]);
}

it('shares the current hotel with every authenticated page', function () {
    $hotel = tenantHotel();
    $user = tenantUser($hotel);

    $this->actingAs($user)
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('currentHotel.id', $hotel->id)
            ->where('currentHotel.name', $hotel->name)
            ->has('hotels', 1)
            ->where('hotels.0.id', $hotel->id));
});

it('lists only the clients that belong to the current hotel', function () {
    $north = tenantHotel('Hotel Norte');
    $south = tenantHotel('Hotel Sur');

    tenantClient($north, ['first_name' => 'Norte']);
    tenantClient($south, ['first_name' => 'Sur']);

    $this->actingAs(tenantUser($north))
        ->get('/clients')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('clients', 1)
            ->where('clients.0.first_name', 'Norte'));
});

it('returns 404 for clients of another hotel', function () {
    $north = tenantHotel('Hotel Norte');
    $south = tenantHotel('Hotel Sur');

    $client = tenantClient($south);
    $user = tenantUser($north);

    $this->actingAs($user)->get("/clients/{$client->id}")->assertNotFound();
    $this->actingAs($user)->get("/clients/{$client->id}/edit")->assertNotFound();
    $this->actingAs($user)->put("/clients/{$client->id}", [
        'first_name' => 'Intruso',
        'last_name' => 'Total',
        'cedula' => '40200000099',
        'address' => 'Calle Falsa 123',
        'phone_number' => '8090000000',
    ])->assertNotFound();
    $this->actingAs($user)->delete("/clients/{$client->id}")->assertNotFound();
    $this->actingAs($user)->patch("/clients/{$client->id}/restore")->assertNotFound();

    $persisted = Client::withoutGlobalScope('hotel')->findOrFail($client->id);

    expect($persisted->active)->toBeTrue()
        ->and($persisted->first_name)->toBe('Cliente');
});

it('stores new clients in the current hotel', function () {
    $north = tenantHotel('Hotel Norte');
    $south = tenantHotel('Hotel Sur');
    $user = tenantUser($north);

    $this->actingAs($user)
        ->post('/clients', [
            'first_name' => 'María',
            'last_name' => 'Santos',
            'cedula' => '40200000077',
            'address' => 'Av. 27 de Febrero 5',
            'phone_number' => '8095551234',
        ])
        ->assertRedirect('/clients');

    $client = Client::withoutGlobalScope('hotel')->where('cedula', '40200000077')->firstOrFail();

    expect($client->hotel_id)->toBe($north->id)
        ->and(Client::withoutGlobalScope('hotel')->where('hotel_id', $south->id)->count())->toBe(0);
});

it('rejects an area that belongs to another hotel when creating a room', function () {
    $north = tenantHotel('Hotel Norte');
    $south = tenantHotel('Hotel Sur');

    $foreignArea = tenantArea($south);

    $this->actingAs(tenantUser($north))
        ->post('/rooms', [
            'name' => 'Suite 101',
            'capacity' => 2,
            'shape' => 'rectangle',
            'area_id' => $foreignArea->id,
        ])
        ->assertSessionHasErrors('area_id');

    expect(Room::withoutGlobalScope('hotel')->count())->toBe(0);
});

it('lists only the map data of the current hotel', function () {
    $north = tenantHotel('Hotel Norte');
    $south = tenantHotel('Hotel Sur');

    $northArea = tenantArea($north, ['name' => 'Norte PB']);
    $southArea = tenantArea($south, ['name' => 'Sur PB']);

    Room::create([
        'hotel_id' => $north->id,
        'name' => 'N-101',
        'capacity' => 2,
        'shape' => 'square',
        'area_id' => $northArea->id,
    ]);

    Room::create([
        'hotel_id' => $south->id,
        'name' => 'S-101',
        'capacity' => 2,
        'shape' => 'square',
        'area_id' => $southArea->id,
    ]);

    $this->actingAs(tenantUser($north))
        ->get('/rooms')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('areas', 1)
            ->where('areas.0.id', $northArea->id)
            ->has('rooms', 1)
            ->where('rooms.0.name', 'N-101'));
});

it('keeps branches isolated between hotels', function () {
    $north = tenantHotel('Hotel Norte');
    $south = tenantHotel('Hotel Sur');

    $branch = Branch::create([
        'hotel_id' => $south->id,
        'name' => 'Sucursal Sur',
        'description' => 'Zona sur',
        'phone_number' => '8090001111',
    ]);

    $user = tenantUser($north);

    $this->actingAs($user)->get("/branches/{$branch->id}")->assertNotFound();
    $this->actingAs($user)->get("/branches/{$branch->id}/edit")->assertNotFound();
    $this->actingAs($user)->delete("/branches/{$branch->id}")->assertNotFound();
    $this->actingAs($user)->patch("/branches/{$branch->id}/restore")->assertNotFound();

    $persisted = Branch::withoutGlobalScope('hotel')->findOrFail($branch->id);

    expect($persisted->status)->toBeTrue();
});

it('switches the active hotel for members and refuses everyone else', function () {
    $north = tenantHotel('Hotel Norte');
    $south = tenantHotel('Hotel Sur');

    tenantClient($south, ['first_name' => 'Sur']);

    $user = tenantUser($north);
    $user->hotels()->attach($south->id, ['role' => 'owner']);

    $this->actingAs($user)
        ->post("/hotels/{$south->id}/switch")
        ->assertRedirect();

    expect(session('current_hotel_id'))->toBe($south->id);

    $this->actingAs($user)
        ->get('/clients')
        ->assertInertia(fn ($page) => $page
            ->where('currentHotel.id', $south->id)
            ->has('clients', 1)
            ->where('clients.0.first_name', 'Sur'));

    $outsider = tenantUser($north);

    $this->actingAs($outsider)
        ->post("/hotels/{$south->id}/switch")
        ->assertForbidden();

    expect(session('current_hotel_id'))->not->toBe($south->id);
});

it('does not allow switching to an inactive hotel', function () {
    $north = tenantHotel('Hotel Norte');
    $closed = tenantHotel('Hotel Cerrado');
    $closed->update(['active' => false]);

    $user = tenantUser($north);
    $user->hotels()->attach($closed->id, ['role' => 'owner']);

    $this->actingAs($user)
        ->post("/hotels/{$closed->id}/switch")
        ->assertForbidden();
});

it('allows the same client document in different hotels but not twice in the same hotel', function () {
    $north = tenantHotel('Hotel Norte');
    $south = tenantHotel('Hotel Sur');

    tenantClient($north, ['cedula' => '40200000055']);

    $payload = [
        'first_name' => 'Cliente',
        'last_name' => 'Repetido',
        'cedula' => '40200000055',
        'address' => 'Calle Duarte 1',
        'phone_number' => '8090000000',
    ];

    $this->actingAs(tenantUser($north))
        ->post('/clients', $payload)
        ->assertSessionHasErrors('cedula');

    $this->actingAs(tenantUser($south))
        ->post('/clients', $payload)
        ->assertRedirect('/clients');

    expect(Client::withoutGlobalScope('hotel')->where('cedula', '40200000055')->count())->toBe(2);
});

it('blocks authenticated users without any assigned hotel', function () {
    $user = User::factory()->create();
    $user->hotels()->sync([]);

    $this->actingAs($user)
        ->get('/dashboard')
        ->assertForbidden();
});

it('authorizes hotel access by membership and role', function () {
    $hotel = tenantHotel('Hotel Norte');
    $other = tenantHotel('Hotel Sur');

    $owner = tenantUser($hotel);

    $staff = User::factory()->create();
    $staff->hotels()->sync([$hotel->id => ['role' => 'staff']]);

    expect($owner->can('view', $hotel))->toBeTrue()
        ->and($owner->can('update', $hotel))->toBeTrue()
        ->and($owner->can('delete', $hotel))->toBeTrue()
        ->and($owner->can('view', $other))->toBeFalse()
        ->and($staff->can('view', $hotel))->toBeTrue()
        ->and($staff->can('update', $hotel))->toBeFalse()
        ->and($staff->can('delete', $hotel))->toBeFalse();
});
