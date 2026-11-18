<?php

use App\Models\Area;
use App\Models\AuditLog;
use App\Models\Bill;
use App\Models\Client;
use App\Models\Hotel;
use App\Models\Payment;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\Service;
use App\Models\ServiceRequest;
use App\Models\User;
use App\Support\CurrentHotel;

beforeEach(function () {
    $this->hotel = useCurrentHotel();
    $this->user = User::factory()->create();
});

function servicesActor(Hotel $hotel, string $role): User
{
    $user = User::factory()->create();
    $user->hotels()->sync([$hotel->id => ['role' => $role]]);

    return $user;
}

function serviceClientRecord(Hotel $hotel, string $lastName = 'Gómez'): Client
{
    return Client::create([
        'hotel_id' => $hotel->id,
        'first_name' => 'Ana',
        'last_name' => $lastName,
        'cedula' => fake()->unique()->numerify('###########'),
        'address' => 'Calle Duarte 10',
        'phone_number' => '8095550000',
        'active' => true,
    ]);
}

/**
 * @param  array<string, mixed>  $attributes
 */
function serviceCatalogRecord(Hotel $hotel, array $attributes = []): Service
{
    return Service::create([
        'hotel_id' => $hotel->id,
        'name' => 'Desayuno buffet',
        'category' => 'restaurante',
        'description' => 'Desayuno completo',
        'price' => 250,
        'active' => true,
        ...$attributes,
    ]);
}

/**
 * @param  array<string, mixed>  $attributes
 */
function serviceRequestRecord(
    Hotel $hotel,
    Service $service,
    Client $client,
    array $attributes = [],
): ServiceRequest {
    return ServiceRequest::create([
        'hotel_id' => $hotel->id,
        'service_id' => $service->id,
        'client_id' => $client->id,
        'status' => ServiceRequest::PENDIENTE,
        'quantity' => 1,
        'unit_price' => $service->price,
        'total' => (float) $service->price,
        'requested_at' => now()->toDateString(),
        ...$attributes,
    ]);
}

/**
 * @return array<string, mixed>
 */
function serviceRequestPayload(
    Service $service,
    Client $client,
    int $quantity = 2,
    ?float $unitPrice = null,
    string $key = 'request-key',
): array {
    return [
        'service_id' => $service->id,
        'client_id' => $client->id,
        'quantity' => $quantity,
        'unit_price' => $unitPrice,
        'requested_at' => now()->toDateString(),
        'notes' => 'Sin azúcar',
        'idempotency_key' => $key,
    ];
}

it('redirects guests to the login screen', function () {
    $this->get('/services')->assertRedirect('/login');
});

it('forbids roles without the services permission', function () {
    $inventory = servicesActor($this->hotel, 'inventario');

    $this->actingAs($inventory)->get('/services')->assertForbidden();

    $reception = servicesActor($this->hotel, 'recepcion');

    $this->actingAs($reception)->get('/services')->assertOk();
});

it('renders the service desk with indicators and filters', function () {
    $active = serviceCatalogRecord($this->hotel);
    serviceCatalogRecord($this->hotel, [
        'name' => 'Masaje relajante',
        'category' => 'spa',
        'price' => 900,
        'active' => false,
    ]);
    $client = serviceClientRecord($this->hotel);

    serviceRequestRecord($this->hotel, $active, $client, [
        'status' => ServiceRequest::PENDIENTE,
    ]);
    serviceRequestRecord($this->hotel, $active, $client, [
        'status' => ServiceRequest::COMPLETADO,
        'completed_at' => now()->toDateString(),
    ]);

    $bill = Bill::create([
        'hotel_id' => $this->hotel->id,
        'client_id' => $client->id,
        'number' => 'SRV-TEST-1',
        'issued_at' => now()->toDateString(),
        'subtotal' => 500,
        'tax' => 0,
        'total' => 500,
        'status' => 'Pendiente',
        'active' => true,
    ]);

    serviceRequestRecord($this->hotel, $active, $client, [
        'status' => ServiceRequest::FACTURADO,
        'quantity' => 2,
        'unit_price' => 250,
        'total' => 500,
        'bill_id' => $bill->id,
        'billed_at' => now(),
    ]);

    $this->actingAs($this->user)
        ->get('/services?tab=solicitudes&request_state=completado')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Services/Index')
            ->where('kpis.activeServices', 1)
            ->where('kpis.requested', 3)
            ->where('kpis.open', 1)
            ->where('kpis.readyToBill', 1)
            ->where('kpis.billedCount', 1)
            ->where('kpis.billedRevenue', 500)
            ->where('filters.tab', 'solicitudes')
            ->where('filters.request_state', 'completado')
            ->where('permissions.manage', true)
            ->where('permissions.bill', true)
            ->has('services.data', 2)
            ->has('requests.data', 1)
            ->has('readyRequests', 1)
            ->has('servicesForRequest', 1));
});

it('creates a catalog service with an audit trail', function () {
    $this->actingAs($this->user)
        ->post('/services/catalog', [
            'name' => '  Cena romántica  ',
            'category' => 'restaurante',
            'description' => 'Menú para dos',
            'price' => 1500.5,
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $service = Service::query()->firstOrFail();

    expect($service->name)->toBe('Cena romántica')
        ->and((float) $service->price)->toBe(1500.5)
        ->and($service->active)->toBeTrue();

    expect(AuditLog::query()
        ->where('module', 'services')
        ->where('action', 'service_created')
        ->where('subject_id', $service->id)
        ->exists())->toBeTrue();
});

it('rejects a duplicated service name inside the same hotel', function () {
    serviceCatalogRecord($this->hotel, ['name' => 'Tour ciudad']);

    $this->actingAs($this->user)
        ->post('/services/catalog', [
            'name' => 'Tour ciudad',
            'category' => 'tour',
            'price' => 100,
        ])
        ->assertSessionHasErrors('name');
});

it('registers a request and computes its total on the server', function () {
    $service = serviceCatalogRecord($this->hotel);
    $client = serviceClientRecord($this->hotel);

    $this->actingAs($this->user)
        ->post('/services/requests', [
            ...serviceRequestPayload($service, $client, 3, 200),
            'total' => 1,
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $request = ServiceRequest::query()->firstOrFail();

    expect($request->status)->toBe(ServiceRequest::PENDIENTE)
        ->and($request->quantity)->toBe(3)
        ->and((float) $request->unit_price)->toBe(200.0)
        ->and((float) $request->total)->toBe(600.0)
        ->and($request->created_by)->toBe($this->user->id);

    expect(AuditLog::query()
        ->where('module', 'services')
        ->where('action', 'request_created')
        ->where('subject_id', $request->id)
        ->exists())->toBeTrue();
});

it('registers the same request only once when the idempotency key repeats', function () {
    $service = serviceCatalogRecord($this->hotel);
    $client = serviceClientRecord($this->hotel);
    $payload = serviceRequestPayload($service, $client, 2, 250, 'same-key');

    $this->actingAs($this->user)->post('/services/requests', $payload)->assertSessionHasNoErrors();
    $this->actingAs($this->user)->post('/services/requests', $payload)->assertSessionHasNoErrors();

    expect(ServiceRequest::query()->count())->toBe(1);
});

it('derives the client from the selected reservation', function () {
    $service = serviceCatalogRecord($this->hotel);
    $client = serviceClientRecord($this->hotel, 'Reservante');
    $other = serviceClientRecord($this->hotel, 'Otro');

    $area = Area::create([
        'hotel_id' => $this->hotel->id,
        'name' => 'Planta baja',
        'x' => 0,
        'y' => 0,
        'width' => 800,
        'height' => 600,
    ]);

    $room = Room::create([
        'hotel_id' => $this->hotel->id,
        'name' => '101',
        'capacity' => 2,
        'area_id' => $area->id,
        'shape' => 'rectangle',
        'active' => true,
        'status' => 'ocupada',
    ]);

    $reservation = Reservation::create([
        'hotel_id' => $this->hotel->id,
        'client_id' => $client->id,
        'room_id' => $room->id,
        'reserved_at' => now(),
        'guests' => 2,
        'finished_at' => now()->addDays(2),
        'user_id' => $this->user->id,
        'status' => 'En curso',
        'active' => true,
    ]);

    $this->actingAs($this->user)
        ->post('/services/requests', [
            ...serviceRequestPayload($service, $other),
            'reservation_id' => $reservation->id,
        ])
        ->assertSessionHasNoErrors();

    expect(ServiceRequest::query()->firstOrFail()->client_id)->toBe($client->id);
});

it('moves a request through its lifecycle', function () {
    $service = serviceCatalogRecord($this->hotel);
    $client = serviceClientRecord($this->hotel);
    $request = serviceRequestRecord($this->hotel, $service, $client);

    $this->actingAs($this->user)
        ->post("/services/requests/{$request->id}/status", ['status' => 'facturado'])
        ->assertSessionHasErrors('status');

    $this->actingAs($this->user)
        ->post("/services/requests/{$request->id}/status", ['status' => 'en_proceso'])
        ->assertSessionHasNoErrors();

    expect($request->fresh()->status)->toBe(ServiceRequest::EN_PROCESO);

    $this->actingAs($this->user)
        ->post("/services/requests/{$request->id}/status", ['status' => 'completado'])
        ->assertSessionHasNoErrors();

    $request->refresh();

    expect($request->status)->toBe(ServiceRequest::COMPLETADO)
        ->and($request->completed_at)->not->toBeNull();

    $this->actingAs($this->user)
        ->post("/services/requests/{$request->id}/status", ['status' => 'en_proceso'])
        ->assertSessionHasErrors('status');
});

it('bills a completed request into a new invoice', function () {
    $service = serviceCatalogRecord($this->hotel, ['price' => 300]);
    $client = serviceClientRecord($this->hotel);
    $request = serviceRequestRecord($this->hotel, $service, $client, [
        'status' => ServiceRequest::COMPLETADO,
        'quantity' => 2,
        'total' => 600,
        'completed_at' => now()->toDateString(),
    ]);

    $this->actingAs($this->user)
        ->post("/services/requests/{$request->id}/bill", ['bill_id' => null])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $request->refresh();
    $bill = Bill::query()->findOrFail($request->bill_id);
    $detail = $bill->details()->firstOrFail();

    expect($request->status)->toBe(ServiceRequest::FACTURADO)
        ->and($request->billed_at)->not->toBeNull()
        ->and($request->billed_by)->toBe($this->user->id)
        ->and($bill->client_id)->toBe($client->id)
        ->and($bill->status)->toBe('Pendiente')
        ->and((float) $bill->subtotal)->toBe(600.0)
        ->and((float) $bill->total)->toBe(600.0)
        ->and($detail->id)->toBe($request->bill_detail_id)
        ->and($detail->description)->toBe($service->name)
        ->and($detail->quantity)->toBe(2)
        ->and((float) $detail->subtotal)->toBe(600.0)
        ->and($bill->number)->toStartWith('SRV-');

    $this->actingAs($this->user)
        ->post("/services/requests/{$request->id}/bill", ['bill_id' => null])
        ->assertSessionHasErrors('request');

    expect(Bill::query()->count())->toBe(1);
});

it('refuses to bill a request that is not completed', function () {
    $service = serviceCatalogRecord($this->hotel);
    $client = serviceClientRecord($this->hotel);
    $request = serviceRequestRecord($this->hotel, $service, $client);

    $this->actingAs($this->user)
        ->post("/services/requests/{$request->id}/bill", ['bill_id' => null])
        ->assertSessionHasErrors('request');

    expect(Bill::query()->count())->toBe(0)
        ->and($request->fresh()->status)->toBe(ServiceRequest::PENDIENTE);
});

it('appends the service to an open invoice without collections', function () {
    $service = serviceCatalogRecord($this->hotel, ['price' => 100]);
    $client = serviceClientRecord($this->hotel);
    $request = serviceRequestRecord($this->hotel, $service, $client, [
        'status' => ServiceRequest::COMPLETADO,
        'quantity' => 1,
        'total' => 100,
        'completed_at' => now()->toDateString(),
    ]);

    $bill = Bill::create([
        'hotel_id' => $this->hotel->id,
        'client_id' => $client->id,
        'number' => 'FAC-100',
        'issued_at' => now()->toDateString(),
        'subtotal' => 200,
        'tax' => 20,
        'total' => 220,
        'status' => 'Pendiente',
        'active' => true,
    ]);

    $this->actingAs($this->user)
        ->post("/services/requests/{$request->id}/bill", ['bill_id' => $bill->id])
        ->assertSessionHasNoErrors();

    $bill->refresh();

    expect((float) $bill->subtotal)->toBe(300.0)
        ->and((float) $bill->tax)->toBe(20.0)
        ->and((float) $bill->total)->toBe(320.0)
        ->and($bill->details()->count())->toBe(1);

    $otherClient = serviceClientRecord($this->hotel, 'Distinto');
    $otherBill = Bill::create([
        'hotel_id' => $this->hotel->id,
        'client_id' => $otherClient->id,
        'number' => 'FAC-200',
        'issued_at' => now()->toDateString(),
        'subtotal' => 0,
        'tax' => 0,
        'total' => 0,
        'status' => 'Pendiente',
        'active' => true,
    ]);
    $second = serviceRequestRecord($this->hotel, $service, $client, [
        'status' => ServiceRequest::COMPLETADO,
        'completed_at' => now()->toDateString(),
    ]);

    $this->actingAs($this->user)
        ->post("/services/requests/{$second->id}/bill", ['bill_id' => $otherBill->id])
        ->assertSessionHasErrors('bill_id');

    expect($second->fresh()->status)->toBe(ServiceRequest::COMPLETADO);
});

it('does not append lines to an invoice with registered payments', function () {
    $service = serviceCatalogRecord($this->hotel);
    $client = serviceClientRecord($this->hotel);
    $request = serviceRequestRecord($this->hotel, $service, $client, [
        'status' => ServiceRequest::COMPLETADO,
        'completed_at' => now()->toDateString(),
    ]);

    $bill = Bill::create([
        'hotel_id' => $this->hotel->id,
        'client_id' => $client->id,
        'number' => 'FAC-300',
        'issued_at' => now()->toDateString(),
        'subtotal' => 100,
        'tax' => 0,
        'total' => 100,
        'status' => 'Pendiente',
        'active' => true,
    ]);

    Payment::create([
        'hotel_id' => $this->hotel->id,
        'bill_id' => $bill->id,
        'client_id' => $client->id,
        'method' => 'efectivo',
        'amount' => 20,
        'paid_at' => now()->toDateString(),
        'status' => 'registrado',
        'created_by' => $this->user->id,
    ]);

    $this->actingAs($this->user)
        ->post("/services/requests/{$request->id}/bill", ['bill_id' => $bill->id])
        ->assertSessionHasErrors('bill_id');

    expect((float) $bill->fresh()->total)->toBe(100.0);
});

it('voids a request and blocks it while its invoice is valid', function () {
    $service = serviceCatalogRecord($this->hotel);
    $client = serviceClientRecord($this->hotel);
    $request = serviceRequestRecord($this->hotel, $service, $client, [
        'status' => ServiceRequest::COMPLETADO,
        'completed_at' => now()->toDateString(),
    ]);

    $this->actingAs($this->user)
        ->post("/services/requests/{$request->id}/void", ['reason' => 'Cancelado por el huésped'])
        ->assertSessionHasNoErrors();

    $request->refresh();

    expect($request->status)->toBe(ServiceRequest::ANULADO)
        ->and($request->void_reason)->toBe('Cancelado por el huésped')
        ->and($request->voided_by)->toBe($this->user->id)
        ->and($request->voided_at)->not->toBeNull();

    $billed = serviceRequestRecord($this->hotel, $service, $client, [
        'status' => ServiceRequest::FACTURADO,
        'billed_at' => now(),
    ]);
    $bill = Bill::create([
        'hotel_id' => $this->hotel->id,
        'client_id' => $client->id,
        'number' => 'FAC-400',
        'issued_at' => now()->toDateString(),
        'subtotal' => 250,
        'tax' => 0,
        'total' => 250,
        'status' => 'Pendiente',
        'active' => true,
    ]);
    $billed->forceFill(['bill_id' => $bill->id])->save();

    $this->actingAs($this->user)
        ->post("/services/requests/{$billed->id}/void", ['reason' => 'Error'])
        ->assertSessionHasErrors('request');

    $bill->forceFill(['status' => 'Anulada', 'active' => false])->save();

    $this->actingAs($this->user)
        ->post("/services/requests/{$billed->id}/void", ['reason' => 'Factura anulada'])
        ->assertSessionHasNoErrors();

    expect($billed->fresh()->status)->toBe(ServiceRequest::ANULADO);
});

it('forbids roles without the manage or bill ability', function () {
    $service = serviceCatalogRecord($this->hotel);
    $client = serviceClientRecord($this->hotel);
    $request = serviceRequestRecord($this->hotel, $service, $client);

    $inventory = servicesActor($this->hotel, 'inventario');

    $this->actingAs($inventory)
        ->post('/services/catalog', [
            'name' => 'No permitido',
            'category' => 'otro',
            'price' => 10,
        ])
        ->assertForbidden();

    $this->actingAs($inventory)
        ->post('/services/requests', serviceRequestPayload($service, $client))
        ->assertForbidden();

    $reception = servicesActor($this->hotel, 'recepcion');

    $this->actingAs($reception)
        ->post('/services/requests', serviceRequestPayload($service, $client, 1, null, 'reception-key'))
        ->assertSessionHasNoErrors();

    $this->actingAs($reception)
        ->post("/services/requests/{$request->id}/status", ['status' => 'en_proceso'])
        ->assertSessionHasNoErrors();
});

it('does not expose services or requests from another hotel', function () {
    $otherHotel = Hotel::factory()->create(['name' => 'Hotel Sur']);

    app(CurrentHotel::class)->set($otherHotel->id);
    $otherService = serviceCatalogRecord($otherHotel, ['name' => 'Servicio externo']);
    $otherClient = serviceClientRecord($otherHotel, 'Externo');
    $otherRequest = serviceRequestRecord($otherHotel, $otherService, $otherClient, [
        'status' => ServiceRequest::COMPLETADO,
        'completed_at' => now()->toDateString(),
    ]);
    app(CurrentHotel::class)->set($this->hotel->id);

    $this->actingAs($this->user)
        ->get('/services')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('services.data', 0)
            ->has('requests.data', 0)
            ->has('readyRequests', 0));

    $this->actingAs($this->user)
        ->post("/services/requests/{$otherRequest->id}/bill", ['bill_id' => null])
        ->assertNotFound();

    expect(Bill::query()->count())->toBe(0);
});
