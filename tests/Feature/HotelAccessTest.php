<?php

use App\Models\Branch;
use App\Models\Client;
use App\Models\User;

beforeEach(function () {
    useCurrentHotel();
});

it('redirects guests away from every business module', function (string $uri) {
    $this->get($uri)->assertRedirect(route('login'));
})->with([
    '/clients',
    '/clients/create',
    '/rooms',
    '/rooms/create',
    '/branches',
    '/branches/create',
    '/reservations',
    '/calendars',
    '/buildings',
    '/bills',
    '/beds',
]);

it('blocks guests from writing business data', function () {
    $this->post('/clients', [
        'first_name' => 'Anon',
        'last_name' => 'Guest',
        'cedula' => '40200000000',
        'address' => 'Calle Falsa 123',
        'phone_number' => '8090000000',
    ])->assertRedirect(route('login'));

    expect(Client::count())->toBe(0);
});

it('allows authenticated users to list clients', function () {
    $user = User::factory()->create();

    Client::create([
        'first_name' => 'Ana',
        'last_name' => 'Pérez',
        'cedula' => '40200000001',
        'address' => 'Av. Independencia 10',
        'phone_number' => '8091112222',
    ]);

    $this->actingAs($user)
        ->get('/clients')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Clients/Index')
            ->has('clients', 1));
});

it('creates, deactivates and restores a client', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post('/clients', [
        'first_name' => 'Luis',
        'last_name' => 'Martínez',
        'cedula' => '40200000002',
        'address' => 'Calle Duarte 12',
        'phone_number' => '8093334444',
    ])->assertRedirect('/clients');

    $client = Client::firstOrFail();
    expect($client->active)->toBeTrue();

    $this->actingAs($user)
        ->get("/clients/{$client->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('Clients/Show'));

    $this->actingAs($user)
        ->delete("/clients/{$client->id}")
        ->assertRedirect('/clients');

    expect($client->fresh()->active)->toBeFalse();

    $this->actingAs($user)
        ->patch("/clients/{$client->id}/restore")
        ->assertRedirect('/clients');

    expect($client->fresh()->active)->toBeTrue();
});

it('creates a branch even when the description is empty', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post('/branches', [
        'name' => 'Sucursal Centro',
        'description' => '',
        'phone_number' => '809-555-0000',
    ])->assertRedirect('/branches');

    $branch = Branch::firstOrFail();

    expect($branch->name)->toBe('Sucursal Centro')
        ->and($branch->status)->toBeTrue();
});

it('deactivates and restores a branch through explicit actions', function () {
    $user = User::factory()->create();

    $branch = Branch::create([
        'name' => 'Sucursal Norte',
        'description' => 'Avenida principal',
        'phone_number' => '809-555-1111',
    ]);

    $this->actingAs($user)
        ->delete("/branches/{$branch->id}")
        ->assertRedirect('/branches');

    expect($branch->fresh()->status)->toBeFalse();

    $this->actingAs($user)
        ->patch("/branches/{$branch->id}/restore")
        ->assertRedirect('/branches');

    expect($branch->fresh()->status)->toBeTrue();
});

it('shows a friendly placeholder for modules that are not implemented yet', function () {
    $user = User::factory()->create();

    foreach (['/reservations', '/calendars', '/buildings', '/bills', '/beds'] as $uri) {
        $this->actingAs($user)
            ->get($uri)
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('coming-soon'));
    }
});
