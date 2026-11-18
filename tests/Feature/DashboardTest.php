<?php

use App\Models\Area;
use App\Models\Bill;
use App\Models\Client;
use App\Models\Hotel;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\User;
use Illuminate\Support\Carbon;

beforeEach(function () {
    $this->hotel = useCurrentHotel();
    $this->user = User::factory()->create();
});

/**
 * Builds a local hotel timestamp and converts it to UTC, which is how
 * reservation timestamps are persisted by the application.
 */
function dashboardLocalTime(string $value): Carbon
{
    return Carbon::parse($value, 'America/Santo_Domingo')->utc();
}

function dashboardClient(string $lastName = 'Pérez'): Client
{
    return Client::create([
        'first_name' => 'Huésped',
        'last_name' => $lastName,
        'cedula' => fake()->unique()->numerify('###########'),
        'address' => 'Calle 1',
        'phone_number' => '8090000000',
    ]);
}

function dashboardRoom(
    Area $area,
    string $name,
    string $status,
    bool $active = true,
): Room {
    return Room::create([
        'name' => $name,
        'capacity' => 2,
        'shape' => 'rectangle',
        'area_id' => $area->id,
        'status' => $status,
        'active' => $active,
    ]);
}

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $this->actingAs($this->user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->has('currency')
            ->has('timezone')
            ->has('generatedAt')
            ->has('kpis')
            ->has('revenueSeries', 30)
            ->has('reservationTrend', 14)
            ->has('reservationsByStatus', 5)
            ->has('roomDistribution')
            ->has('recentReservations')
            ->has('upcomingCheckIns')
            ->has('upcomingCheckOuts')
            ->has('recentBills'));
});

test('calculates the dashboard metrics from real records', function () {
    $this->travelTo(Carbon::parse('2026-11-18 14:00:00', 'UTC'));

    $client = dashboardClient();
    $area = Area::create([
        'name' => 'Planta baja',
        'x' => 0,
        'y' => 0,
        'width' => 800,
        'height' => 600,
    ]);

    $occupiedRoom = dashboardRoom($area, '101', 'disponible');
    dashboardRoom($area, '102', 'ocupada');
    dashboardRoom($area, '103', 'reservada');
    dashboardRoom($area, '104', 'mantenimiento');
    dashboardRoom($area, '105', 'disponible', active: false);

    Reservation::create([
        'client_id' => $client->id,
        'room_id' => $occupiedRoom->id,
        'reserved_at' => dashboardLocalTime('2026-11-18 09:00:00'),
        'finished_at' => dashboardLocalTime('2026-11-20 11:00:00'),
        'guests' => 2,
        'user_id' => $this->user->id,
        'status' => 'En curso',
    ]);

    Reservation::create([
        'client_id' => $client->id,
        'room_id' => $occupiedRoom->id,
        'reserved_at' => dashboardLocalTime('2026-11-19 14:00:00'),
        'guests' => 1,
        'user_id' => $this->user->id,
        'status' => 'Pendiente',
    ]);

    Reservation::create([
        'client_id' => $client->id,
        'room_id' => $occupiedRoom->id,
        'reserved_at' => dashboardLocalTime('2026-11-17 14:00:00'),
        'finished_at' => dashboardLocalTime('2026-11-19 12:00:00'),
        'guests' => 3,
        'user_id' => $this->user->id,
        'status' => 'Confirmada',
    ]);

    Reservation::create([
        'client_id' => $client->id,
        'room_id' => $occupiedRoom->id,
        'reserved_at' => dashboardLocalTime('2026-11-10 14:00:00'),
        'finished_at' => dashboardLocalTime('2026-11-12 12:00:00'),
        'guests' => 2,
        'user_id' => $this->user->id,
        'status' => 'Finalizada',
        'active' => false,
    ]);

    Reservation::create([
        'client_id' => $client->id,
        'room_id' => $occupiedRoom->id,
        'reserved_at' => dashboardLocalTime('2026-10-01 14:00:00'),
        'guests' => 4,
        'user_id' => $this->user->id,
        'status' => 'Cancelada',
    ]);

    Bill::create([
        'client_id' => $client->id,
        'number' => 'FAC-0001',
        'issued_at' => '2026-11-18',
        'subtotal' => 100,
        'tax' => 18,
        'total' => 118,
        'status' => 'Pagada',
    ]);

    Bill::create([
        'client_id' => $client->id,
        'number' => 'FAC-0002',
        'issued_at' => '2026-11-17',
        'subtotal' => 59,
        'tax' => 0,
        'total' => 59,
        'status' => 'Pendiente',
    ]);

    Bill::create([
        'client_id' => $client->id,
        'number' => 'FAC-0003',
        'issued_at' => '2026-10-15',
        'subtotal' => 236,
        'tax' => 0,
        'total' => 236,
        'status' => 'Pagada',
    ]);

    // Voided bills must not count as revenue.
    Bill::create([
        'client_id' => $client->id,
        'number' => 'FAC-0004',
        'issued_at' => '2026-11-18',
        'subtotal' => 500,
        'tax' => 0,
        'total' => 500,
        'status' => 'Anulada',
    ]);

    // Deactivated bills must not count either.
    Bill::create([
        'client_id' => $client->id,
        'number' => 'FAC-0005',
        'issued_at' => '2026-11-18',
        'subtotal' => 300,
        'tax' => 0,
        'total' => 300,
        'status' => 'Pagada',
        'active' => false,
    ]);

    $this->actingAs($this->user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->where('currency', 'DOP')
            ->where('timezone', 'America/Santo_Domingo')
            ->where('kpis.revenueToday', fn ($value) => (float) $value === 118.0)
            ->where('kpis.paidToday', fn ($value) => (float) $value === 118.0)
            ->where('kpis.revenueTodayChange', fn ($value) => (float) $value === 100.0)
            ->where('kpis.revenueMonth', fn ($value) => (float) $value === 177.0)
            ->where('kpis.paidMonth', fn ($value) => (float) $value === 118.0)
            ->where('kpis.revenueMonthChange', fn ($value) => (float) $value === -25.0)
            ->where('kpis.activeReservations', 3)
            ->where('kpis.pendingReservations', 1)
            ->where('kpis.inHouseReservations', 1)
            ->where('kpis.inHouseGuests', 2)
            ->where('kpis.totalRooms', 4)
            ->where('kpis.occupiedRooms', 1)
            ->where('kpis.availableRooms', 1)
            ->where('kpis.reservedRooms', 1)
            ->where('kpis.maintenanceRooms', 1)
            ->where('kpis.occupancyRate', fn ($value) => (float) $value === 25.0)
            ->where('reservationsByStatus', function ($statuses) {
                return collect($statuses)->pluck('count', 'status')->all() === [
                    'Pendiente' => 1,
                    'Confirmada' => 1,
                    'En curso' => 1,
                    'Finalizada' => 0,
                    'Cancelada' => 1,
                ];
            })
            ->where('reservationTrend', fn ($trend) => collect($trend)->sum('count') === 2)
            ->where('revenueSeries', function ($series) {
                $last = collect($series)->last();

                return $series->count() === 30
                    && $last['date'] === '2026-11-18'
                    && (float) $last['invoiced'] === 118.0
                    && (float) $last['paid'] === 118.0;
            })
            ->where('roomDistribution', function ($distribution) {
                return $distribution->count() === 1
                    && $distribution->first()['area'] === 'Planta baja'
                    && $distribution->first()['count'] === 4;
            })
            ->has('recentReservations', 4)
            ->has('upcomingCheckIns', 1)
            ->has('upcomingCheckOuts', 1)
            ->has('recentBills', 4));
});

test('shows an honest empty state when the hotel has no records', function () {
    $this->actingAs($this->user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->where('kpis.revenueToday', fn ($value) => (float) $value === 0.0)
            ->where('kpis.paidToday', fn ($value) => (float) $value === 0.0)
            ->where('kpis.revenueTodayChange', null)
            ->where('kpis.revenueMonth', fn ($value) => (float) $value === 0.0)
            ->where('kpis.revenueMonthChange', null)
            ->where('kpis.activeReservations', 0)
            ->where('kpis.inHouseGuests', 0)
            ->where('kpis.totalRooms', 0)
            ->where('kpis.occupancyRate', fn ($value) => (float) $value === 0.0)
            ->has('revenueSeries', 30)
            ->has('reservationTrend', 14)
            ->has('reservationsByStatus', 5)
            ->where('roomDistribution', [])
            ->where('recentReservations', [])
            ->where('upcomingCheckIns', [])
            ->where('upcomingCheckOuts', [])
            ->where('recentBills', []));
});

test('keeps dashboard metrics isolated to the current hotel', function () {
    $north = $this->hotel;
    $south = Hotel::factory()->create(['name' => 'Hotel Sur']);

    $this->user->hotels()->sync([$north->id => ['role' => 'owner']]);

    $southClient = Client::create([
        'hotel_id' => $south->id,
        'first_name' => 'Cliente',
        'last_name' => 'Sur',
        'cedula' => '40200000099',
        'address' => 'Calle Sur 1',
        'phone_number' => '8099999999',
    ]);

    $southArea = Area::create([
        'hotel_id' => $south->id,
        'name' => 'Zona Sur',
        'x' => 0,
        'y' => 0,
        'width' => 800,
        'height' => 600,
    ]);

    $southRoom = Room::create([
        'hotel_id' => $south->id,
        'name' => 'SUR-101',
        'capacity' => 2,
        'shape' => 'rectangle',
        'area_id' => $southArea->id,
        'status' => 'ocupada',
    ]);

    Reservation::create([
        'hotel_id' => $south->id,
        'client_id' => $southClient->id,
        'room_id' => $southRoom->id,
        'reserved_at' => now(),
        'guests' => 2,
        'user_id' => $this->user->id,
        'status' => 'Confirmada',
    ]);

    Bill::create([
        'hotel_id' => $south->id,
        'client_id' => $southClient->id,
        'number' => 'SUR-0001',
        'issued_at' => now()->toDateString(),
        'subtotal' => 100,
        'tax' => 0,
        'total' => 100,
        'status' => 'Pagada',
    ]);

    $this->actingAs($this->user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('currentHotel.id', $north->id)
            ->where('kpis.activeReservations', 0)
            ->where('kpis.totalRooms', 0)
            ->where('kpis.revenueToday', fn ($value) => (float) $value === 0.0)
            ->where('roomDistribution', [])
            ->where('recentReservations', [])
            ->where('recentBills', []));
});
