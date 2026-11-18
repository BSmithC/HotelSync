<?php

use App\Models\AuditLog;
use App\Models\Bill;
use App\Models\Client;
use App\Models\Expense;
use App\Models\FinanceMovement;
use App\Models\Hotel;
use App\Models\Payment;
use App\Models\User;
use App\Support\CurrentHotel;

beforeEach(function () {
    $this->hotel = useCurrentHotel();
    $this->user = User::factory()->create();
    $this->client = financeClient($this->hotel);
});

function financeActor(Hotel $hotel, string $role): User
{
    $user = User::factory()->create();
    $user->hotels()->sync([$hotel->id => ['role' => $role]]);

    return $user;
}

function financeClient(Hotel $hotel, string $lastName = 'Pérez'): Client
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

function financeBill(
    Hotel $hotel,
    Client $client,
    float $total = 100,
    array $attributes = [],
): Bill {
    return Bill::create([
        'hotel_id' => $hotel->id,
        'client_id' => $client->id,
        'number' => 'FAC-'.fake()->unique()->numerify('######'),
        'issued_at' => now()->toDateString(),
        'subtotal' => $total,
        'tax' => 0,
        'total' => $total,
        'status' => 'Pendiente',
        'active' => true,
        ...$attributes,
    ]);
}

function financePaymentPayload(Bill $bill, float $amount, string $key = 'key-1'): array
{
    return [
        'bill_id' => $bill->id,
        'method' => 'efectivo',
        'amount' => $amount,
        'paid_at' => now()->toDateString(),
        'reference' => 'REC-1',
        'idempotency_key' => $key,
    ];
}

it('redirects guests to the login screen', function () {
    $this->get('/finance')->assertRedirect('/login');
});

it('forbids roles without the finance permission', function () {
    $reception = financeActor($this->hotel, 'recepcion');

    $this->actingAs($reception)->get('/finance')->assertForbidden();

    $finance = financeActor($this->hotel, 'finanzas');

    $this->actingAs($finance)->get('/finance')->assertOk();
});

it('renders the finance operations center with indicators and period filters', function () {
    $bill = financeBill($this->hotel, $this->client, 200);

    Payment::create([
        'hotel_id' => $this->hotel->id,
        'bill_id' => $bill->id,
        'client_id' => $this->client->id,
        'method' => 'tarjeta',
        'amount' => 50,
        'paid_at' => now()->toDateString(),
        'status' => 'registrado',
        'created_by' => $this->user->id,
    ]);

    Expense::create([
        'hotel_id' => $this->hotel->id,
        'category' => 'operativo',
        'description' => 'Insumos',
        'amount' => 20,
        'expense_date' => now()->toDateString(),
        'method' => 'efectivo',
        'status' => 'registrado',
        'created_by' => $this->user->id,
    ]);

    $this->actingAs($this->user)
        ->get('/finance?tab=cobros&payment_method=tarjeta')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Finance/Index')
            ->where('kpis.invoicedCount', 1)
            ->where('kpis.pendingCount', 1)
            ->has('kpis.invoiced')
            ->has('kpis.pending')
            ->where('filters.tab', 'cobros')
            ->where('filters.payment_method', 'tarjeta')
            ->where('permissions.manage', true)
            ->where('permissions.void', true)
            ->where('permissions.export', true)
            ->has('bills.data', 1)
            ->has('payments.data', 1)
            ->has('expenses.data', 1)
            ->has('series', 6)
            ->has('payableBills', 1));
});

it('registers a partial payment and recomputes the invoice status', function () {
    $bill = financeBill($this->hotel, $this->client, 100);

    $this->actingAs($this->user)
        ->post('/finance/payments', financePaymentPayload($bill, 40))
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    expect($bill->fresh()->status)->toBe('Pendiente');

    $payment = Payment::query()->firstOrFail();

    expect((float) $payment->amount)->toBe(40.0)
        ->and($payment->status)->toBe('registrado')
        ->and($payment->created_by)->toBe($this->user->id);

    expect(FinanceMovement::query()
        ->where('direction', 'ingreso')
        ->where('source_type', $payment->getMorphClass())
        ->where('source_id', $payment->id)
        ->exists())->toBeTrue();

    expect(AuditLog::query()
        ->where('module', 'finance')
        ->where('action', 'payment_registered')
        ->where('subject_id', $payment->id)
        ->exists())->toBeTrue();
});

it('marks the invoice as paid when collections cover its total', function () {
    $bill = financeBill($this->hotel, $this->client, 100);

    $this->actingAs($this->user)
        ->post('/finance/payments', financePaymentPayload($bill, 100))
        ->assertSessionHasNoErrors();

    expect($bill->fresh()->status)->toBe('Pagada');
});

it('rejects overpayments and collections on voided invoices', function () {
    $bill = financeBill($this->hotel, $this->client, 100);

    $this->actingAs($this->user)
        ->post('/finance/payments', financePaymentPayload($bill, 150))
        ->assertSessionHasErrors('amount');

    $voided = financeBill($this->hotel, $this->client, 80, ['status' => 'Anulada', 'active' => false]);

    $this->actingAs($this->user)
        ->post('/finance/payments', financePaymentPayload($voided, 10, 'key-2'))
        ->assertSessionHasErrors('bill_id');

    expect(Payment::query()->count())->toBe(0);
});

it('registers the same payment only once when the idempotency key repeats', function () {
    $bill = financeBill($this->hotel, $this->client, 100);
    $payload = financePaymentPayload($bill, 25, 'same-key');

    $this->actingAs($this->user)
        ->post('/finance/payments', $payload)
        ->assertSessionHasNoErrors();

    $this->actingAs($this->user)
        ->post('/finance/payments', $payload)
        ->assertSessionHasNoErrors();

    expect(Payment::query()->count())->toBe(1)
        ->and(FinanceMovement::query()->where('direction', 'ingreso')->count())->toBe(1);
});

it('voids a payment with a reversal movement and reopens the invoice', function () {
    $bill = financeBill($this->hotel, $this->client, 100);

    $this->actingAs($this->user)
        ->post('/finance/payments', financePaymentPayload($bill, 100))
        ->assertSessionHasNoErrors();

    $payment = Payment::query()->firstOrFail();

    expect($bill->fresh()->status)->toBe('Pagada');

    $this->actingAs($this->user)
        ->post("/finance/payments/{$payment->id}/void", ['reason' => 'Cheque devuelto'])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $payment->refresh();

    expect($payment->status)->toBe('anulado')
        ->and($payment->voided_by)->toBe($this->user->id)
        ->and($payment->void_reason)->toBe('Cheque devuelto')
        ->and($bill->fresh()->status)->toBe('Pendiente')
        ->and($payment->movements()->where('direction', 'egreso')->exists())->toBeTrue();

    $original = FinanceMovement::query()->where('direction', 'ingreso')->firstOrFail();
    $reversal = FinanceMovement::query()->where('direction', 'egreso')->firstOrFail();

    expect($reversal->reversal_of_id)->toBe($original->id)
        ->and(AuditLog::query()
            ->where('module', 'finance')
            ->where('action', 'payment_voided')
            ->exists())->toBeTrue();
});

it('requires a reason to void a payment', function () {
    $bill = financeBill($this->hotel, $this->client, 100);

    $this->actingAs($this->user)
        ->post('/finance/payments', financePaymentPayload($bill, 30))
        ->assertSessionHasNoErrors();

    $payment = Payment::query()->firstOrFail();

    $this->actingAs($this->user)
        ->post("/finance/payments/{$payment->id}/void", [])
        ->assertSessionHasErrors('reason');

    expect($payment->fresh()->status)->toBe('registrado');
});

it('registers expenses once and voids them with a reversal', function () {
    $payload = [
        'category' => 'mantenimiento',
        'description' => 'Reparación de aire',
        'amount' => 75.5,
        'expense_date' => now()->toDateString(),
        'method' => 'transferencia',
        'supplier' => 'Servicios ABC',
        'idempotency_key' => 'expense-key',
    ];

    $this->actingAs($this->user)
        ->post('/finance/expenses', $payload)
        ->assertSessionHasNoErrors();

    $this->actingAs($this->user)
        ->post('/finance/expenses', $payload)
        ->assertSessionHasNoErrors();

    expect(Expense::query()->count())->toBe(1)
        ->and(FinanceMovement::query()->where('direction', 'egreso')->count())->toBe(1);

    $expense = Expense::query()->firstOrFail();

    $this->actingAs($this->user)
        ->post("/finance/expenses/{$expense->id}/void", ['reason' => 'Duplicado'])
        ->assertSessionHasNoErrors();

    expect($expense->fresh()->status)->toBe('anulado')
        ->and($expense->movements()->where('direction', 'ingreso')->exists())->toBeTrue();
});

it('blocks voiding an invoice with registered payments', function () {
    $bill = financeBill($this->hotel, $this->client, 100);

    $this->actingAs($this->user)
        ->post('/finance/payments', financePaymentPayload($bill, 30))
        ->assertSessionHasNoErrors();

    $this->actingAs($this->user)
        ->post("/finance/bills/{$bill->id}/void", ['reason' => 'Error de emisión'])
        ->assertSessionHasErrors('bill');

    expect($bill->fresh()->status)->toBe('Pendiente')
        ->and($bill->fresh()->active)->toBeTrue();
});

it('voids an invoice without registered collections', function () {
    $bill = financeBill($this->hotel, $this->client, 100);

    $this->actingAs($this->user)
        ->post("/finance/bills/{$bill->id}/void", ['reason' => 'Error de emisión'])
        ->assertSessionHasNoErrors();

    $bill->refresh();

    expect($bill->status)->toBe('Anulada')
        ->and($bill->active)->toBeFalse()
        ->and($bill->voided_by)->toBe($this->user->id)
        ->and($bill->void_reason)->toBe('Error de emisión')
        ->and(AuditLog::query()
            ->where('module', 'finance')
            ->where('action', 'bill_voided')
            ->where('subject_id', $bill->id)
            ->exists())->toBeTrue();
});

it('does not expose financial records from another hotel', function () {
    $otherHotel = Hotel::factory()->create(['name' => 'Hotel Sur']);
    $otherClient = financeClient($otherHotel, 'Externa');

    app(CurrentHotel::class)->set($otherHotel->id);
    $otherBill = financeBill($otherHotel, $otherClient, 300);

    app(CurrentHotel::class)->set($this->hotel->id);

    $this->actingAs($this->user)
        ->get('/finance')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('bills.data', 0)
            ->has('payments.data', 0)
            ->has('payableBills', 0));

    $this->actingAs($this->user)
        ->post('/finance/payments', financePaymentPayload($otherBill, 10, 'cross-hotel'))
        ->assertSessionHasErrors('bill_id');

    expect(Payment::query()->count())->toBe(0);
});

it('exports financial data as csv only for roles allowed to export', function () {
    $bill = financeBill($this->hotel, $this->client, 100);

    $this->actingAs($this->user)
        ->post('/finance/payments', financePaymentPayload($bill, 20))
        ->assertSessionHasNoErrors();

    $response = $this->actingAs($this->user)
        ->get('/finance/export?type=payments&from='.now()->toDateString().'&to='.now()->toDateString());

    $response->assertOk();
    $response->assertHeader('content-type', 'text/csv; charset=UTF-8');

    expect($response->streamedContent())
        ->toContain('Factura')
        ->toContain($bill->number)
        ->toContain('20.00');

    $reception = financeActor($this->hotel, 'recepcion');

    $this->actingAs($reception)
        ->get('/finance/export')
        ->assertForbidden();
});
