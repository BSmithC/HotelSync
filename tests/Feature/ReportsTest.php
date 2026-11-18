<?php

use App\Models\Area;
use App\Models\Bill;
use App\Models\Client;
use App\Models\Expense;
use App\Models\FinanceMovement;
use App\Models\Hotel;
use App\Models\InventoryItem;
use App\Models\InventoryMovement;
use App\Models\Payment;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\Service;
use App\Models\ServiceRequest;
use App\Models\User;
use Carbon\CarbonImmutable;

beforeEach(function () {
    $this->hotel = useCurrentHotel();
    $this->user = User::factory()->create();
    $this->timezone = 'America/Santo_Domingo';
});

function reportsActor(Hotel $hotel, string $role): User
{
    $user = User::factory()->create();
    $user->hotels()->sync([$hotel->id => ['role' => $role]]);

    return $user;
}

function reportsClient(Hotel $hotel, string $lastName = 'Pérez'): Client
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

/**
 * @param  array<string, mixed>  $attributes
 */
function reportsBill(
    Hotel $hotel,
    Client $client,
    float $total,
    array $attributes = [],
): Bill {
    return Bill::create([
        'hotel_id' => $hotel->id,
        'client_id' => $client->id,
        'number' => 'REP-'.fake()->unique()->numerify('######'),
        'issued_at' => CarbonImmutable::now('America/Santo_Domingo')->toDateString(),
        'subtotal' => $total,
        'tax' => 0,
        'total' => $total,
        'status' => 'Pendiente',
        'active' => true,
        ...$attributes,
    ]);
}

/**
 * @param  array<string, mixed>  $attributes
 */
function reportsPayment(
    Hotel $hotel,
    Bill $bill,
    float $amount,
    array $attributes = [],
): Payment {
    return Payment::create([
        'hotel_id' => $hotel->id,
        'bill_id' => $bill->id,
        'client_id' => $bill->client_id,
        'method' => 'efectivo',
        'amount' => $amount,
        'paid_at' => CarbonImmutable::now('America/Santo_Domingo')->toDateString(),
        'status' => 'registrado',
        ...$attributes,
    ]);
}

/**
 * @param  array<string, mixed>  $attributes
 */
function reportsExpense(Hotel $hotel, float $amount, array $attributes = []): Expense
{
    return Expense::create([
        'hotel_id' => $hotel->id,
        'category' => 'operativo',
        'description' => 'Insumos',
        'amount' => $amount,
        'expense_date' => CarbonImmutable::now('America/Santo_Domingo')->toDateString(),
        'method' => 'efectivo',
        'status' => 'registrado',
        ...$attributes,
    ]);
}

/**
 * @param  array<string, mixed>  $attributes
 */
function reportsRoom(Hotel $hotel, string $name = '101', array $attributes = []): Room
{
    $area = Area::create([
        'hotel_id' => $hotel->id,
        'name' => 'Planta '.$name,
        'x' => 0,
        'y' => 0,
        'width' => 100,
        'height' => 100,
    ]);

    return Room::create([
        'hotel_id' => $hotel->id,
        'area_id' => $area->id,
        'name' => $name,
        'capacity' => 2,
        'active' => true,
        'status' => 'disponible',
        ...$attributes,
    ]);
}

/**
 * Builds a reservation whose timestamps land at noon in the hotel timezone,
 * so date conversions never shift the stay to a different day.
 *
 * @param  array<string, mixed>  $attributes
 */
function reportsStay(
    Hotel $hotel,
    Room $room,
    Client $client,
    User $user,
    string $arrival,
    ?string $departure,
    array $attributes = [],
): Reservation {
    $timezone = 'America/Santo_Domingo';
    $arrivalAt = CarbonImmutable::parse($arrival, $timezone)->addHours(12)->utc();
    $departureAt = $departure === null
        ? null
        : CarbonImmutable::parse($departure, $timezone)->addHours(12)->utc();

    return Reservation::create([
        'hotel_id' => $hotel->id,
        'client_id' => $client->id,
        'room_id' => $room->id,
        'reserved_at' => $arrivalAt,
        'finished_at' => $departureAt,
        'guests' => 2,
        'user_id' => $user->id,
        'status' => 'Confirmada',
        'active' => true,
        ...$attributes,
    ]);
}

/**
 * @param  array<string, mixed>  $attributes
 */
function reportsService(Hotel $hotel, array $attributes = []): Service
{
    return Service::create([
        'hotel_id' => $hotel->id,
        'name' => 'Desayuno '.fake()->unique()->numerify('###'),
        'category' => 'restaurante',
        'price' => 250,
        'active' => true,
        ...$attributes,
    ]);
}

/**
 * @param  array<string, mixed>  $attributes
 */
function reportsRequest(
    Hotel $hotel,
    Service $service,
    ?Client $client,
    array $attributes = [],
): ServiceRequest {
    return ServiceRequest::create([
        'hotel_id' => $hotel->id,
        'service_id' => $service->id,
        'client_id' => $client?->id,
        'status' => ServiceRequest::PENDIENTE,
        'quantity' => 1,
        'unit_price' => $service->price,
        'total' => (float) $service->price,
        'requested_at' => CarbonImmutable::now('America/Santo_Domingo')->toDateString(),
        ...$attributes,
    ]);
}

/**
 * @param  array<string, mixed>  $attributes
 */
function reportsItem(Hotel $hotel, array $attributes = []): InventoryItem
{
    return InventoryItem::create([
        'hotel_id' => $hotel->id,
        'name' => 'Jabón '.fake()->unique()->numerify('###'),
        'sku' => 'REP-'.fake()->unique()->numerify('#####'),
        'category' => 'limpieza',
        'unit' => 'unidad',
        'min_stock' => 5,
        'unit_cost' => 10,
        'stock' => 0,
        'active' => true,
        ...$attributes,
    ]);
}

/**
 * @param  array<string, mixed>  $attributes
 */
function reportsMovement(Hotel $hotel, InventoryItem $item, array $attributes = []): InventoryMovement
{
    return InventoryMovement::create([
        'hotel_id' => $hotel->id,
        'inventory_item_id' => $item->id,
        'type' => InventoryMovement::ENTRADA,
        'quantity' => 5,
        'reason' => 'Compra',
        'occurred_at' => CarbonImmutable::now('America/Santo_Domingo')->toDateString(),
        ...$attributes,
    ]);
}

function reportsPeriod(): array
{
    $timezone = 'America/Santo_Domingo';
    $to = CarbonImmutable::now($timezone)->startOfDay();

    return [
        $to->subDays(10)->toDateString(),
        $to->toDateString(),
    ];
}

it('redirects guests to the login screen', function () {
    $this->get('/reports')->assertRedirect('/login');
});

it('forbids users without a role in the current hotel', function () {
    $outsider = User::factory()->create();
    $outsider->hotels()->detach();

    $this->actingAs($outsider)->get('/reports')->assertForbidden();
});

it('separates invoiced, collected, pending and expenses in the report', function () {
    [$from, $to] = reportsPeriod();
    $client = reportsClient($this->hotel);

    reportsBill($this->hotel, $client, 1000, ['issued_at' => $to]);
    $previousBill = reportsBill($this->hotel, $client, 400, [
        'issued_at' => CarbonImmutable::parse($from)->subDays(5)->toDateString(),
    ]);

    $currentBill = Bill::query()->where('total', 1000)->firstOrFail();

    reportsPayment($this->hotel, $currentBill, 300, ['paid_at' => $to]);
    reportsPayment($this->hotel, $previousBill, 200, [
        'paid_at' => CarbonImmutable::parse($from)->subDays(5)->toDateString(),
    ]);

    reportsExpense($this->hotel, 100, ['expense_date' => $to]);
    reportsExpense($this->hotel, 50, [
        'expense_date' => CarbonImmutable::parse($from)->subDays(5)->toDateString(),
    ]);

    $this->actingAs($this->user)
        ->get("/reports?from={$from}&to={$to}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Reports/Index')
            ->where('kpis.invoiced', fn ($value) => (float) $value === 1000.0)
            ->where('kpis.invoicedCount', 1)
            ->where('kpis.collected', fn ($value) => (float) $value === 300.0)
            ->where('kpis.collectedCount', 1)
            ->where('kpis.expenses', fn ($value) => (float) $value === 100.0)
            ->where('kpis.expensesCount', 1)
            ->where('kpis.net', fn ($value) => (float) $value === 200.0)
            ->where('kpis.pending', fn ($value) => (float) $value === 900.0)
            ->where('previous.invoiced', fn ($value) => (float) $value === 400.0)
            ->where('previous.collected', fn ($value) => (float) $value === 200.0)
            ->where('previous.expenses', fn ($value) => (float) $value === 50.0)
            ->where('period.days', 11)
            ->where('filters.tab', 'resumen')
            ->where('permissions.export', true)
            ->has('series', 11)
            ->has('expensesByCategory', 1)
            ->has('revenueByMethod', 1));
});

it('never sums voided or inactive documents', function () {
    [$from, $to] = reportsPeriod();
    $client = reportsClient($this->hotel);

    reportsBill($this->hotel, $client, 100, ['issued_at' => $to]);
    reportsBill($this->hotel, $client, 500, [
        'issued_at' => $to,
        'status' => 'Anulada',
        'voided_at' => now(),
    ]);
    reportsBill($this->hotel, $client, 600, [
        'issued_at' => $to,
        'active' => false,
    ]);

    $bill = Bill::query()->where('total', 100)->firstOrFail();

    reportsPayment($this->hotel, $bill, 100, ['paid_at' => $to]);
    reportsPayment($this->hotel, $bill, 500, [
        'paid_at' => $to,
        'status' => 'anulado',
        'voided_at' => now(),
    ]);

    reportsExpense($this->hotel, 20, ['expense_date' => $to]);
    reportsExpense($this->hotel, 30, [
        'expense_date' => $to,
        'status' => 'anulado',
        'voided_at' => now(),
    ]);

    $this->actingAs($this->user)
        ->get("/reports?from={$from}&to={$to}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('kpis.invoiced', fn ($value) => (float) $value === 100.0)
            ->where('kpis.invoicedCount', 1)
            ->where('kpis.collected', fn ($value) => (float) $value === 100.0)
            ->where('kpis.collectedCount', 1)
            ->where('kpis.expenses', fn ($value) => (float) $value === 20.0)
            ->where('kpis.expensesCount', 1)
            ->where('kpis.net', fn ($value) => (float) $value === 80.0)
            ->where('kpis.pending', fn ($value) => (float) $value === 0.0));
});

it('computes occupancy from active overlapping reservations only', function () {
    $toDate = CarbonImmutable::now($this->timezone)->startOfDay();
    $to = $toDate->toDateString();
    $from = $toDate->subDays(2)->toDateString();
    $fromDate = CarbonImmutable::parse($from);

    $client = reportsClient($this->hotel);
    $firstRoom = reportsRoom($this->hotel, '101');
    reportsRoom($this->hotel, '102');

    // Two nights inside the period.
    reportsStay(
        $this->hotel,
        $firstRoom,
        $client,
        $this->user,
        $from,
        $fromDate->addDays(2)->toDateString(),
        ['guests' => 2],
    );

    // One night inside the period, started before it.
    reportsStay(
        $this->hotel,
        $firstRoom,
        $client,
        $this->user,
        $fromDate->subDay()->toDateString(),
        $fromDate->addDay()->toDateString(),
        ['guests' => 3],
    );

    // Cancelled and out-of-period stays must never count.
    reportsStay(
        $this->hotel,
        $firstRoom,
        $client,
        $this->user,
        $from,
        $fromDate->addDay()->toDateString(),
        ['guests' => 9, 'status' => 'Cancelada'],
    );
    reportsStay(
        $this->hotel,
        $firstRoom,
        $client,
        $this->user,
        $fromDate->subDays(6)->toDateString(),
        $fromDate->subDays(4)->toDateString(),
        ['guests' => 4],
    );

    $this->actingAs($this->user)
        ->get("/reports?from={$from}&to={$to}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('kpis.reservations', 2)
            ->where('kpis.guests', 5)
            ->where('kpis.roomNights', 3)
            ->where('kpis.activeRooms', 2)
            ->where('kpis.occupancyRate', fn ($value) => (float) $value === 50.0)
            ->where('series.0.occupancy', fn ($value) => (float) $value === 100.0)
            ->where('series.1.occupancy', fn ($value) => (float) $value === 50.0)
            ->where('counts.operacion', 2)
            ->where('reservationsByStatus', fn ($collection) => collect($collection)
                ->firstWhere('status', 'Cancelada')['count'] === 0));
});

it('scopes every section to the current hotel', function () {
    [$from, $to] = reportsPeriod();
    $otherHotel = Hotel::factory()->create();

    $client = reportsClient($this->hotel);
    $otherClient = reportsClient($otherHotel, 'Externo');

    reportsBill($this->hotel, $client, 100, ['issued_at' => $to]);
    reportsBill($otherHotel, $otherClient, 999, ['issued_at' => $to]);

    $bill = Bill::query()->where('total', 100)->firstOrFail();
    $otherBill = Bill::withoutGlobalScopes()->where('total', 999)->firstOrFail();

    reportsPayment($this->hotel, $bill, 40, ['paid_at' => $to]);
    reportsPayment($otherHotel, $otherBill, 500, ['paid_at' => $to]);

    reportsExpense($this->hotel, 10, ['expense_date' => $to]);
    reportsExpense($otherHotel, 500, ['expense_date' => $to]);

    $item = reportsItem($this->hotel, ['stock' => 1, 'min_stock' => 5]);
    $otherItem = reportsItem($otherHotel, ['stock' => 0, 'min_stock' => 5]);

    reportsMovement($this->hotel, $item);
    reportsMovement($otherHotel, $otherItem);

    $service = reportsService($this->hotel);
    $otherService = reportsService($otherHotel);

    reportsRequest($this->hotel, $service, $client);
    reportsRequest($otherHotel, $otherService, $otherClient);

    $room = reportsRoom($this->hotel, '201');
    $otherRoom = reportsRoom($otherHotel, '901');

    reportsStay($this->hotel, $room, $client, $this->user, $from, $to);
    reportsStay($otherHotel, $otherRoom, $otherClient, $this->user, $from, $to);

    FinanceMovement::create([
        'hotel_id' => $this->hotel->id,
        'direction' => 'ingreso',
        'amount' => 40,
        'description' => 'Cobro local',
        'occurred_at' => now(),
    ]);
    FinanceMovement::create([
        'hotel_id' => $otherHotel->id,
        'direction' => 'ingreso',
        'amount' => 500,
        'description' => 'Cobro ajeno',
        'occurred_at' => now(),
    ]);

    $this->actingAs($this->user)
        ->get("/reports?from={$from}&to={$to}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('kpis.invoiced', fn ($value) => (float) $value === 100.0)
            ->where('kpis.collected', fn ($value) => (float) $value === 40.0)
            ->where('kpis.expenses', fn ($value) => (float) $value === 10.0)
            ->where('counts.finanzas', 1)
            ->where('counts.operacion', 1)
            ->where('counts.servicios', 1)
            ->where('counts.inventario', 1)
            ->where('lowStock', fn ($collection) => collect($collection)->count() === 1)
            ->where('lowStock.0.name', $item->name)
            ->where('topServices', fn ($collection) => collect($collection)->count() === 1)
            ->where('topServices.0.service', $service->name));
});

it('paginates and filters the detail of the active tab', function () {
    [$from, $to] = reportsPeriod();

    foreach (range(1, 13) as $index) {
        FinanceMovement::create([
            'hotel_id' => $this->hotel->id,
            'direction' => 'ingreso',
            'amount' => $index * 10,
            'description' => $index === 7 ? 'Cierre especial' : "Movimiento {$index}",
            'occurred_at' => now(),
        ]);
    }

    $this->actingAs($this->user)
        ->get("/reports?from={$from}&to={$to}&tab=finanzas")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('filters.tab', 'finanzas')
            ->where('counts.finanzas', 13)
            ->where('detail.total', 13)
            ->has('detail.data', 12)
            ->has('detail.data.0.date'));

    $this->actingAs($this->user)
        ->get("/reports?from={$from}&to={$to}&tab=finanzas&detail_page=2")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('detail.data', 1)
            ->where('detail.current_page', 2));

    $this->actingAs($this->user)
        ->get("/reports?from={$from}&to={$to}&tab=finanzas&search=especial")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('filters.search', 'especial')
            ->has('detail.data', 1)
            ->where('detail.data.0.description', 'Cierre especial'));
});

it('caps the requested period at one year', function () {
    $to = CarbonImmutable::now($this->timezone)->toDateString();

    $this->actingAs($this->user)
        ->get("/reports?from=2020-01-01&to={$to}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('period.days', 366)
            ->has('series', 366));
});

it('protects the CSV export with the export permission', function () {
    [$from, $to] = reportsPeriod();

    $reception = reportsActor($this->hotel, 'recepcion');

    $this->actingAs($reception)
        ->get('/reports/export')
        ->assertForbidden();

    $finance = reportsActor($this->hotel, 'finanzas');

    $summary = $this->actingAs($finance)
        ->get("/reports/export?from={$from}&to={$to}&type=resumen")
        ->assertOk()
        ->assertHeader('content-type', 'text/csv; charset=UTF-8');

    expect($summary->streamedContent())->toContain('Indicador')
        ->toContain('Facturado');

    $financeExport = $this->actingAs($finance)
        ->get("/reports/export?from={$from}&to={$to}&type=finanzas")
        ->assertOk();

    expect($financeExport->streamedContent())->toContain('Movimiento')
        ->toContain('Dirección');
});
