<?php

use App\Models\Area;
use App\Models\AuditLog;
use App\Models\Bill;
use App\Models\Client;
use App\Models\Hotel;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\Service;
use App\Models\ServiceRequest;
use App\Models\User;
use App\Support\HotelConfig;
use App\Support\RoomStatus;

/**
 * Creates a user attached to the given hotel with a single role.
 */
function hotelSettingsActor(Hotel $hotel, string $role): User
{
    $user = User::factory()->create();

    $user->hotels()->sync([$hotel->id => ['role' => $role]]);

    return $user;
}

function hotelSettingsClient(Hotel $hotel): Client
{
    return Client::create([
        'hotel_id' => $hotel->id,
        'first_name' => 'Ana',
        'last_name' => 'Pérez',
        'cedula' => fake()->unique()->numerify('###########'),
        'address' => 'Calle Duarte 10',
        'phone_number' => '8095550000',
        'active' => true,
    ]);
}

function hotelSettingsRoom(Hotel $hotel, int $capacity = 2): Room
{
    $area = Area::create([
        'hotel_id' => $hotel->id,
        'name' => 'Planta baja',
        'x' => 0,
        'y' => 0,
        'width' => 800,
        'height' => 600,
    ]);

    return Room::create([
        'hotel_id' => $hotel->id,
        'name' => 'Habitación 101',
        'capacity' => $capacity,
        'shape' => 'rectangle',
        'area_id' => $area->id,
        'pos_x' => 0,
        'pos_y' => 0,
        'width' => 60,
        'height' => 60,
        'rotation' => 0,
    ]);
}

beforeEach(function () {
    $this->hotel = useCurrentHotel();
    $this->owner = hotelSettingsActor($this->hotel, 'owner');
});

it('redirects guests to the login screen', function () {
    $this->get('/settings/hotel/general')->assertRedirect('/login');
    $this->patch('/settings/hotel/regional', [])->assertRedirect('/login');
});

it('forbids roles without the settings ability', function () {
    $reception = hotelSettingsActor($this->hotel, 'recepcion');

    $this->actingAs($reception)
        ->get('/settings/hotel/general')
        ->assertForbidden();

    $this->actingAs($reception)
        ->patch('/settings/hotel/finance', [
            'tax_rate' => 18,
            'invoice_prefix' => 'HTL',
        ])
        ->assertForbidden();
});

it('renders the hotel settings pages for owners and admins', function (string $role) {
    $user = hotelSettingsActor($this->hotel, $role);

    $this->actingAs($user);

    foreach ([
        '/settings/hotel/general',
        '/settings/hotel/regional',
        '/settings/hotel/reservations',
        '/settings/hotel/finance',
        '/settings/hotel/rooms',
    ] as $url) {
        $this->get($url)->assertOk();
    }
})->with(['owner', 'admin']);

it('updates the hotel identity in real columns and audits the change', function () {
    $this->actingAs($this->owner)
        ->patch('/settings/hotel/general', [
            'name' => 'Hotel Mar Caribe',
            'legal_name' => 'Mar Caribe S.R.L.',
            'rnc' => '1-01-01010-1',
            'address' => 'Av. Independencia 45',
            'phone' => '809-555-0100',
            'email' => 'reservas@marcaribe.test',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $hotel = $this->hotel->fresh();

    expect($hotel->name)->toBe('Hotel Mar Caribe')
        ->and($hotel->legal_name)->toBe('Mar Caribe S.R.L.')
        ->and($hotel->rnc)->toBe('1-01-01010-1')
        ->and($hotel->address)->toBe('Av. Independencia 45')
        ->and($hotel->phone)->toBe('809-555-0100')
        ->and($hotel->email)->toBe('reservas@marcaribe.test');

    $log = AuditLog::query()
        ->where('module', 'settings')
        ->where('action', 'hotel_profile_updated')
        ->firstOrFail();

    expect($log->subject_id)->toBe($hotel->id)
        ->and($log->user_id)->toBe($this->owner->id)
        ->and($log->changes['after']['name'])->toBe('Hotel Mar Caribe');
});

it('validates the hotel identity fields', function () {
    $this->actingAs($this->owner)
        ->patch('/settings/hotel/general', [
            'name' => '',
            'rnc' => 'abc',
            'email' => 'no-es-un-correo',
        ])
        ->assertSessionHasErrors(['name', 'rnc', 'email']);

    expect($this->hotel->fresh()->name)->not->toBe('');
});

it('stores the regional settings and preserves unrelated settings', function () {
    $this->hotel->update([
        'settings' => [
            'room_status_colors' => RoomStatus::COLORS,
            'legacy' => ['kept' => true],
        ],
    ]);

    $this->actingAs($this->owner)
        ->patch('/settings/hotel/regional', [
            'currency' => 'usd',
            'timezone' => 'America/New_York',
            'locale' => 'en-US',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $hotel = $this->hotel->fresh();

    expect($hotel->currency)->toBe('USD')
        ->and($hotel->timezone)->toBe('America/New_York')
        ->and($hotel->settings['regional'])->toBe(['locale' => 'en-US'])
        ->and($hotel->settings['room_status_colors'])->toBe(RoomStatus::COLORS)
        ->and($hotel->settings['legacy'])->toBe(['kept' => true]);
});

it('restores the regional defaults', function () {
    $this->hotel->update([
        'currency' => 'USD',
        'timezone' => 'America/New_York',
        'settings' => ['regional' => ['locale' => 'en-US']],
    ]);

    $this->actingAs($this->owner)
        ->patch('/settings/hotel/regional/reset')
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $hotel = $this->hotel->fresh();

    expect($hotel->currency)->toBe(HotelConfig::DEFAULT_CURRENCY)
        ->and($hotel->timezone)->toBe(HotelConfig::DEFAULT_TIMEZONE)
        ->and($hotel->settings['regional'])->toBe([
            'locale' => HotelConfig::DEFAULT_LOCALE,
        ]);
});

it('stores the reservation policy and rejects an inverted stay range', function () {
    $this->actingAs($this->owner)
        ->patch('/settings/hotel/reservations', [
            'check_in_time' => '15:00',
            'check_out_time' => '12:00',
            'min_nights' => 2,
            'max_nights' => 14,
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $this->hotel->refresh();

    expect(HotelConfig::for($this->hotel))->toMatchArray([
        'check_in_time' => '15:00',
        'check_out_time' => '12:00',
        'min_nights' => 2,
        'max_nights' => 14,
    ]);

    $this->actingAs($this->owner)
        ->patch('/settings/hotel/reservations', [
            'check_in_time' => '15:00',
            'check_out_time' => '12:00',
            'min_nights' => 10,
            'max_nights' => 3,
        ])
        ->assertSessionHasErrors('max_nights');
});

it('enforces the configured stay limits when creating a reservation', function () {
    $client = hotelSettingsClient($this->hotel);
    $room = hotelSettingsRoom($this->hotel);

    $this->hotel->update([
        'settings' => [
            'reservations' => [
                'check_in_time' => '15:00',
                'check_out_time' => '12:00',
                'min_nights' => 2,
                'max_nights' => 5,
            ],
        ],
    ]);

    $this->actingAs($this->owner)
        ->post('/reservations', [
            'client_id' => $client->id,
            'room_id' => $room->id,
            'reserved_at' => '2026-12-01 15:00:00',
            'finished_at' => '2026-12-02 12:00:00',
            'guests' => 1,
            'status' => 'Pendiente',
        ])
        ->assertSessionHasErrors('finished_at');

    $this->actingAs($this->owner)
        ->post('/reservations', [
            'client_id' => $client->id,
            'room_id' => $room->id,
            'reserved_at' => '2026-12-01 15:00:00',
            'finished_at' => '2026-12-20 12:00:00',
            'guests' => 1,
            'status' => 'Pendiente',
        ])
        ->assertSessionHasErrors('finished_at');
});

it('enforces the room capacity when creating a reservation', function () {
    $client = hotelSettingsClient($this->hotel);
    $room = hotelSettingsRoom($this->hotel, capacity: 2);

    $this->actingAs($this->owner)
        ->post('/reservations', [
            'client_id' => $client->id,
            'room_id' => $room->id,
            'reserved_at' => '2026-12-01 15:00:00',
            'finished_at' => '2026-12-03 12:00:00',
            'guests' => 3,
            'status' => 'Pendiente',
        ])
        ->assertSessionHasErrors('guests');
});

it('lets a historical reservation change status without reapplying the policy', function () {
    $client = hotelSettingsClient($this->hotel);
    $room = hotelSettingsRoom($this->hotel, capacity: 2);

    $this->hotel->update([
        'settings' => [
            'reservations' => [
                'check_in_time' => '15:00',
                'check_out_time' => '12:00',
                'min_nights' => 2,
                'max_nights' => 5,
            ],
        ],
    ]);

    // This reservation was created before the policy existed: one night and
    // more guests than the room allows today.
    $reservation = Reservation::create([
        'client_id' => $client->id,
        'room_id' => $room->id,
        'reserved_at' => '2026-12-01 15:00:00',
        'finished_at' => '2026-12-02 12:00:00',
        'guests' => 3,
        'user_id' => $this->owner->id,
        'status' => 'Pendiente',
    ]);

    $this->actingAs($this->owner)
        ->patch("/reservations/{$reservation->id}", [
            'client_id' => $client->id,
            'room_id' => $room->id,
            'reserved_at' => $reservation->reserved_at->toDateTimeString(),
            'finished_at' => $reservation->finished_at?->toDateTimeString(),
            'guests' => 3,
            'status' => 'Confirmada',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect('/reservations');

    $reservation->refresh();

    expect($reservation->status)->toBe('Confirmada')
        ->and($reservation->guests)->toBe(3);
});

it('reapplies the policy when the stay or the guests change', function () {
    $client = hotelSettingsClient($this->hotel);
    $room = hotelSettingsRoom($this->hotel, capacity: 2);

    $this->hotel->update([
        'settings' => [
            'reservations' => [
                'check_in_time' => '15:00',
                'check_out_time' => '12:00',
                'min_nights' => 2,
                'max_nights' => 5,
            ],
        ],
    ]);

    $reservation = Reservation::create([
        'client_id' => $client->id,
        'room_id' => $room->id,
        'reserved_at' => '2026-12-01 15:00:00',
        'finished_at' => '2026-12-02 12:00:00',
        'guests' => 3,
        'user_id' => $this->owner->id,
        'status' => 'Pendiente',
    ]);

    $payload = [
        'client_id' => $client->id,
        'room_id' => $room->id,
        'reserved_at' => $reservation->reserved_at->toDateTimeString(),
        'finished_at' => $reservation->finished_at?->toDateTimeString(),
        'guests' => 3,
        'status' => 'Confirmada',
    ];

    $this->actingAs($this->owner)
        ->patch("/reservations/{$reservation->id}", [
            ...$payload,
            'guests' => 4,
        ])
        ->assertSessionHasErrors('guests');

    $this->actingAs($this->owner)
        ->patch("/reservations/{$reservation->id}", [
            ...$payload,
            'reserved_at' => '2026-12-05 15:00:00',
            'finished_at' => '2026-12-06 12:00:00',
        ])
        ->assertSessionHasErrors('finished_at');

    expect($reservation->fresh()->status)->toBe('Pendiente');
});

it('stores the finance settings and applies them to new invoices only', function () {
    $this->actingAs($this->owner)
        ->patch('/settings/hotel/finance', [
            'tax_rate' => 18,
            'invoice_prefix' => 'htl',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    expect(HotelConfig::for($this->hotel->fresh()))->toMatchArray([
        'tax_rate' => 18.0,
        'invoice_prefix' => 'HTL',
    ]);

    $client = hotelSettingsClient($this->hotel);
    $service = Service::create([
        'hotel_id' => $this->hotel->id,
        'name' => 'Desayuno buffet',
        'category' => 'restaurante',
        'price' => 300,
        'active' => true,
    ]);
    $request = ServiceRequest::create([
        'hotel_id' => $this->hotel->id,
        'service_id' => $service->id,
        'client_id' => $client->id,
        'status' => ServiceRequest::COMPLETADO,
        'quantity' => 2,
        'unit_price' => 300,
        'total' => 600,
        'requested_at' => now()->toDateString(),
        'completed_at' => now()->toDateString(),
    ]);

    $this->actingAs($this->owner)
        ->post("/services/requests/{$request->id}/bill", ['bill_id' => null])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $bill = Bill::query()->findOrFail($request->fresh()->bill_id);

    expect((float) $bill->subtotal)->toBe(600.0)
        ->and((float) $bill->tax)->toBe(108.0)
        ->and((float) $bill->total)->toBe(708.0)
        ->and($bill->number)->toStartWith('HTL-');
});

it('restores the finance defaults', function () {
    $this->hotel->update([
        'settings' => [
            'finance' => ['tax_rate' => 18, 'invoice_prefix' => 'HTL'],
        ],
    ]);

    $this->actingAs($this->owner)
        ->patch('/settings/hotel/finance/reset')
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    expect(HotelConfig::for($this->hotel->fresh()))->toMatchArray([
        'tax_rate' => HotelConfig::DEFAULT_TAX_RATE,
        'invoice_prefix' => HotelConfig::DEFAULT_INVOICE_PREFIX,
    ]);
});

it('saves the room status palette without touching other settings', function () {
    $this->hotel->update([
        'settings' => ['finance' => ['tax_rate' => 10, 'invoice_prefix' => 'HTL']],
    ]);

    $colors = [
        RoomStatus::DISPONIBLE => '#111111',
        RoomStatus::OCUPADA => '#222222',
        RoomStatus::RESERVADA => '#333333',
        RoomStatus::LIMPIEZA => '#444444',
        RoomStatus::MANTENIMIENTO => '#555555',
    ];

    $this->actingAs($this->owner)
        ->patch('/hotels/current/settings', ['room_status_colors' => $colors])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $settings = $this->hotel->fresh()->settings;

    expect($settings['room_status_colors'])->toBe($colors)
        ->and($settings['finance'])->toBe([
            'tax_rate' => 10,
            'invoice_prefix' => 'HTL',
        ]);
});
