<?php

use App\Models\Area;
use App\Models\Hotel;
use App\Models\Room;
use App\Models\RoomStatusLog;
use App\Models\User;
use App\Support\CurrentHotel;
use App\Support\RoomStatus;

/**
 * Creates a user attached to the given hotel with a single role.
 */
function roomsRoleUser(Hotel $hotel, string $role): User
{
    $user = User::factory()->create();

    $user->hotels()->sync([$hotel->id => ['role' => $role]]);

    return $user;
}

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
        'category' => 'Suite',
        'bed_count' => 2,
        'amenities' => ['Wi-Fi', 'Jacuzzi'],
        'status' => 'disponible',
    ])->assertRedirect('/rooms');

    $room->refresh();

    expect($room->name)->toBe('Suite 103 Reformada')
        ->and($room->capacity)->toBe(4)
        ->and($room->category)->toBe('Suite')
        ->and($room->bed_count)->toBe(2)
        ->and($room->amenities)->toBe(['Wi-Fi', 'Jacuzzi'])
        ->and($room->price)->toBe('4500.50');
});

it('saves the status palette for the current hotel', function () {
    $colors = RoomStatus::COLORS;
    $colors[RoomStatus::OCUPADA] = '#aa1122';

    $this->actingAs($this->user)
        ->patch('/hotels/current/settings', [
            'room_status_colors' => $colors,
        ])
        ->assertRedirect();

    expect($this->hotel->fresh()->settings['room_status_colors'])
        ->toBe($colors);
});

it('rejects an incomplete status palette', function () {
    $this->actingAs($this->user)
        ->patch('/hotels/current/settings', [
            'room_status_colors' => [RoomStatus::DISPONIBLE => '#12b76a'],
        ])
        ->assertSessionHasErrors('room_status_colors');

    expect($this->hotel->fresh()->settings)->toBeNull();
});

it('only lets layout managers change the status palette', function () {
    $reception = roomsRoleUser($this->hotel, 'recepcion');

    $this->actingAs($reception)
        ->patch('/hotels/current/settings', [
            'room_status_colors' => RoomStatus::COLORS,
        ])
        ->assertForbidden();

    expect($this->hotel->fresh()->settings)->toBeNull();
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

it('saves the whole map layout in one request', function () {
    $room = Room::create([
        'name' => 'Habitación 104',
        'capacity' => 2,
        'shape' => 'rectangle',
        'area_id' => $this->area->id,
        'pos_x' => 0,
        'pos_y' => 0,
        'width' => 60,
        'height' => 60,
        'rotation' => 0,
    ]);

    $this->actingAs($this->user)
        ->put('/rooms/layout', [
            'areas' => [[
                'id' => $this->area->id,
                'x' => 40,
                'y' => 30,
                'width' => 900,
                'height' => 700,
                'type' => 'jardin',
                'color' => '#dcfce7',
                'floor' => 1,
                'building_id' => null,
                'active' => true,
            ]],
            'rooms' => [[
                'id' => $room->id,
                'area_id' => $this->area->id,
                'pos_x' => 120,
                'pos_y' => 90,
                'width' => 140,
                'height' => 100,
                'rotation' => 0,
            ]],
        ])
        ->assertRedirect();

    $this->area->refresh();
    $room->refresh();

    expect($this->area->type)->toBe('jardin')
        ->and($this->area->x)->toBe(40)
        ->and($this->area->width)->toBe(900)
        ->and($room->pos_x)->toBe(120)
        ->and($room->pos_y)->toBe(90)
        ->and($room->width)->toBe(140);
});

it('rejects a layout where a room does not fit inside its area', function () {
    $room = Room::create([
        'name' => 'Habitación 105',
        'capacity' => 2,
        'shape' => 'rectangle',
        'area_id' => $this->area->id,
        'pos_x' => 0,
        'pos_y' => 0,
        'width' => 60,
        'height' => 60,
        'rotation' => 0,
    ]);

    $this->actingAs($this->user)
        ->put('/rooms/layout', [
            'areas' => [[
                'id' => $this->area->id,
                'x' => 0,
                'y' => 0,
                'width' => 500,
                'height' => 400,
                'type' => 'zona',
            ]],
            'rooms' => [[
                'id' => $room->id,
                'area_id' => $this->area->id,
                'pos_x' => 450,
                'pos_y' => 20,
                'width' => 100,
                'height' => 80,
                'rotation' => 0,
            ]],
        ])
        ->assertSessionHasErrors('rooms.0.pos_x');

    expect($room->fresh()->pos_x)->toBe(0);
});

it('only lets owners and admins edit the layout', function () {
    $reception = roomsRoleUser($this->hotel, 'recepcion');
    $room = Room::create([
        'name' => 'Habitación 106',
        'capacity' => 2,
        'shape' => 'rectangle',
        'area_id' => $this->area->id,
        'pos_x' => 0,
        'pos_y' => 0,
        'width' => 60,
        'height' => 60,
        'rotation' => 0,
    ]);

    $this->actingAs($reception)
        ->put('/rooms/layout', [
            'areas' => [[
                'id' => $this->area->id,
                'x' => 0,
                'y' => 0,
                'width' => 800,
                'height' => 600,
                'type' => 'zona',
            ]],
            'rooms' => [[
                'id' => $room->id,
                'area_id' => $this->area->id,
                'pos_x' => 100,
                'pos_y' => 100,
                'width' => 60,
                'height' => 60,
                'rotation' => 0,
            ]],
        ])
        ->assertForbidden();

    $this->actingAs($reception)
        ->post('/rooms', [
            'name' => 'Habitación 107',
            'capacity' => 2,
            'shape' => 'rectangle',
            'area_id' => $this->area->id,
        ])
        ->assertForbidden();

    $this->actingAs($reception)
        ->get('/rooms')
        ->assertOk();
});

it('hides the map from roles without the rooms permission', function () {
    $inventory = roomsRoleUser($this->hotel, 'inventario');

    $this->actingAs($inventory)
        ->get('/rooms')
        ->assertForbidden();
});

it('returns the real room details used by the side panel', function () {
    $room = Room::create([
        'name' => 'Habitación 108',
        'capacity' => 3,
        'category' => 'Suite',
        'bed_count' => 2,
        'amenities' => ['Wi-Fi', 'Jacuzzi'],
        'shape' => 'rectangle',
        'area_id' => $this->area->id,
        'pos_x' => 20,
        'pos_y' => 20,
        'width' => 60,
        'height' => 60,
        'rotation' => 0,
        'status' => 'ocupada',
    ]);

    RoomStatusLog::create([
        'room_id' => $room->id,
        'previous_status' => 'disponible',
        'status' => 'ocupada',
        'changed_by' => $this->user->id,
        'reason' => 'Check-in',
    ]);

    $this->actingAs($this->user)
        ->getJson("/rooms/{$room->id}/details")
        ->assertOk()
        ->assertJsonPath('room.name', 'Habitación 108')
        ->assertJsonPath('room.category', 'Suite')
        ->assertJsonPath('room.bed_count', 2)
        ->assertJsonPath('room.amenities.0', 'Wi-Fi')
        ->assertJsonPath('room.status_history.0.status', 'ocupada')
        ->assertJsonPath('room.status_history.0.reason', 'Check-in');
});

it('does not expose rooms from another hotel in the panel', function () {
    $otherHotel = Hotel::factory()->create(['name' => 'Hotel Sur']);

    app(CurrentHotel::class)->set($otherHotel->id);

    $otherArea = Area::create([
        'name' => 'Planta baja',
        'x' => 0,
        'y' => 0,
        'width' => 800,
        'height' => 600,
    ]);

    $otherRoom = Room::create([
        'name' => 'Habitación Sur 1',
        'capacity' => 2,
        'shape' => 'rectangle',
        'area_id' => $otherArea->id,
        'pos_x' => 0,
        'pos_y' => 0,
        'width' => 60,
        'height' => 60,
        'rotation' => 0,
    ]);

    app(CurrentHotel::class)->set($this->hotel->id);

    $this->actingAs($this->user)
        ->getJson("/rooms/{$otherRoom->id}/details")
        ->assertNotFound();
});
