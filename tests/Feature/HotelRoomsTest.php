<?php

use App\Models\Area;
use App\Models\Room;
use App\Models\User;

beforeEach(function () {
    useCurrentHotel();

    $this->user = User::factory()->create();
    $this->area = Area::create([
        'name' => 'Planta baja',
        'x' => 0,
        'y' => 0,
        'width' => 800,
        'height' => 600,
    ]);
});

it('creates an area from the rooms screen', function () {
    $this->actingAs($this->user)
        ->post('/areas', [
            'name' => 'Planta alta',
            'width' => 900,
            'height' => 700,
        ])
        ->assertRedirect();

    expect(Area::where('name', 'Planta alta')->exists())->toBeTrue();
});

it('creates a room inside an area', function () {
    $this->actingAs($this->user)->post('/rooms', [
        'name' => 'Suite 101',
        'capacity' => 3,
        'shape' => 'rectangle',
        'area_id' => $this->area->id,
    ])->assertRedirect('/rooms');

    $room = Room::firstOrFail();

    expect($room->name)->toBe('Suite 101')
        ->and($room->area_id)->toBe($this->area->id)
        ->and($room->active)->toBeTrue();
});

it('saves the position when a room is dragged', function () {
    $room = Room::create([
        'name' => 'Suite 102',
        'capacity' => 2,
        'shape' => 'square',
        'area_id' => $this->area->id,
        'pos_x' => 100,
        'pos_y' => 100,
        'width' => 60,
        'height' => 60,
        'rotation' => 0,
    ]);

    $this->actingAs($this->user)
        ->patch("/rooms/{$room->id}", [
            'pos_x' => 240,
            'pos_y' => 180,
        ])
        ->assertRedirect();

    expect($room->fresh()->pos_x)->toBe(240)
        ->and($room->fresh()->pos_y)->toBe(180);
});

it('updates the room settings without the old tenant connection', function () {
    $room = Room::create([
        'name' => 'Suite 103',
        'capacity' => 2,
        'shape' => 'rectangle',
        'area_id' => $this->area->id,
        'pos_x' => 0,
        'pos_y' => 0,
        'width' => 60,
        'height' => 60,
        'rotation' => 0,
    ]);

    $this->actingAs($this->user)->put("/rooms/{$room->id}", [
        'settings' => true,
        'name' => 'Suite 103 Reformada',
        'capacity' => 4,
        'shape' => 'rectangle',
        'area_id' => $this->area->id,
        'description' => 'Vista al jardín',
        'price' => 4500.50,
        'phone' => '809-000-0000',
        'status' => 'disponible',
    ])->assertRedirect('/rooms');

    $room->refresh();

    expect($room->name)->toBe('Suite 103 Reformada')
        ->and($room->capacity)->toBe(4)
        ->and($room->price)->toBe('4500.50');
});

it('filters the rooms by the selected area', function () {
    $otherArea = Area::create([
        'name' => 'Planta alta',
        'x' => 0,
        'y' => 0,
        'width' => 800,
        'height' => 600,
    ]);

    Room::create([
        'name' => 'Habitación A',
        'capacity' => 1,
        'shape' => 'square',
        'area_id' => $this->area->id,
        'pos_x' => 0,
        'pos_y' => 0,
        'width' => 60,
        'height' => 60,
        'rotation' => 0,
    ]);

    Room::create([
        'name' => 'Habitación B',
        'capacity' => 1,
        'shape' => 'square',
        'area_id' => $otherArea->id,
        'pos_x' => 0,
        'pos_y' => 0,
        'width' => 60,
        'height' => 60,
        'rotation' => 0,
    ]);

    $this->actingAs($this->user)
        ->get("/rooms?area_id={$otherArea->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Rooms/Index')
            ->has('rooms', 1)
            ->where('rooms.0.name', 'Habitación B'));
});
