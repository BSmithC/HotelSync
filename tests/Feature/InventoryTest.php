<?php

use App\Models\AuditLog;
use App\Models\Hotel;
use App\Models\InventoryItem;
use App\Models\InventoryMovement;
use App\Models\User;
use App\Support\CurrentHotel;

beforeEach(function () {
    $this->hotel = useCurrentHotel();
    $this->user = User::factory()->create();
});

function inventoryActor(Hotel $hotel, string $role): User
{
    $user = User::factory()->create();
    $user->hotels()->sync([$hotel->id => ['role' => $role]]);

    return $user;
}

/**
 * @param  array<string, mixed>  $attributes
 */
function inventoryItem(Hotel $hotel, array $attributes = []): InventoryItem
{
    return InventoryItem::create([
        'hotel_id' => $hotel->id,
        'name' => 'Jabón de baño',
        'sku' => 'JAB-'.fake()->unique()->numerify('#####'),
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
 * @return array<string, mixed>
 */
function inventoryMovementPayload(
    string $type = 'entrada',
    float $quantity = 10,
    string $key = 'movement-key',
): array {
    return [
        'type' => $type,
        'quantity' => $quantity,
        'unit_cost' => 10,
        'reason' => 'Compra de suministros',
        'reference' => 'FAC-100',
        'occurred_at' => now()->toDateString(),
        'idempotency_key' => $key,
    ];
}

/**
 * @param  array<string, mixed>  $attributes
 */
function inventoryActivity(Hotel $hotel, array $attributes = []): AuditLog
{
    return AuditLog::create([
        'hotel_id' => $hotel->id,
        'module' => 'inventory',
        'action' => 'item_created',
        'description' => 'Actividad de prueba',
        ...$attributes,
    ]);
}

it('redirects guests to the login screen', function () {
    $this->get('/inventory')->assertRedirect('/login');
});

it('forbids roles without the inventory permission', function () {
    $reception = inventoryActor($this->hotel, 'recepcion');

    $this->actingAs($reception)->get('/inventory')->assertForbidden();

    $inventory = inventoryActor($this->hotel, 'inventario');

    $this->actingAs($inventory)->get('/inventory')->assertOk();
});

it('renders the inventory center with indicators and filters', function () {
    inventoryItem($this->hotel, ['name' => 'Jabón', 'stock' => 12, 'min_stock' => 5]);
    inventoryItem($this->hotel, ['name' => 'Toallas', 'stock' => 0, 'min_stock' => 3]);

    InventoryMovement::create([
        'hotel_id' => $this->hotel->id,
        'inventory_item_id' => InventoryItem::query()->firstOrFail()->id,
        'type' => 'entrada',
        'quantity' => 12,
        'unit_cost' => 10,
        'reason' => 'Compra inicial',
        'occurred_at' => now()->toDateString(),
        'created_by' => $this->user->id,
    ]);

    $this->actingAs($this->user)
        ->get('/inventory?tab=movimientos&movement_type=entrada')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Inventory/Index')
            ->where('kpis.totalItems', 2)
            ->where('kpis.outOfStock', 1)
            ->where('kpis.lowStock', 0)
            ->where('filters.tab', 'movimientos')
            ->where('filters.movement_type', 'entrada')
            ->where('permissions.manage', true)
            ->where('permissions.adjust', true)
            ->has('items.data', 2)
            ->has('movements.data', 1)
            ->has('alerts', 1)
            ->has('itemsForMovement', 2));
});

it('creates an item with a normalized sku and an audit trail', function () {
    $this->actingAs($this->user)
        ->post('/inventory/items', [
            'name' => 'Papel higiénico',
            'sku' => ' ph-001 ',
            'category' => 'papeleria',
            'unit' => 'paquete',
            'min_stock' => 4,
            'unit_cost' => 85.5,
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $item = InventoryItem::query()->firstOrFail();

    expect($item->name)->toBe('Papel higiénico')
        ->and($item->sku)->toBe('PH-001')
        ->and((float) $item->stock)->toBe(0.0)
        ->and($item->active)->toBeTrue();

    expect(AuditLog::query()
        ->where('module', 'inventory')
        ->where('action', 'item_created')
        ->where('subject_id', $item->id)
        ->exists())->toBeTrue();
});

it('rejects a duplicated sku inside the same hotel', function () {
    inventoryItem($this->hotel, ['sku' => 'DUP-1']);

    $this->actingAs($this->user)
        ->post('/inventory/items', [
            'name' => 'Otro artículo',
            'sku' => 'dup-1',
            'category' => 'otro',
            'unit' => 'unidad',
        ])
        ->assertSessionHasErrors('sku');
});

it('registers entries and exits updating the cached stock', function () {
    $item = inventoryItem($this->hotel);

    $this->actingAs($this->user)
        ->post("/inventory/items/{$item->id}/movements", inventoryMovementPayload('entrada', 10))
        ->assertSessionHasNoErrors();

    $this->actingAs($this->user)
        ->post("/inventory/items/{$item->id}/movements", inventoryMovementPayload('salida', 4, 'exit-key'))
        ->assertSessionHasNoErrors();

    expect((float) $item->fresh()->stock)->toBe(6.0)
        ->and($item->fresh()->movements()->count())->toBe(2);

    $quantities = $item->movements()->orderBy('id')->pluck('quantity')
        ->map(fn ($value) => (float) $value)
        ->all();

    expect($quantities)->toBe([10.0, -4.0]);

    expect(AuditLog::query()
        ->where('module', 'inventory')
        ->where('action', 'movement_registered')
        ->count())->toBe(2);
});

it('rejects an exit that would leave negative stock', function () {
    $item = inventoryItem($this->hotel);

    $this->actingAs($this->user)
        ->post("/inventory/items/{$item->id}/movements", inventoryMovementPayload('entrada', 3))
        ->assertSessionHasNoErrors();

    $this->actingAs($this->user)
        ->post("/inventory/items/{$item->id}/movements", inventoryMovementPayload('salida', 5, 'too-much'))
        ->assertSessionHasErrors('quantity');

    expect((float) $item->fresh()->stock)->toBe(3.0)
        ->and($item->fresh()->movements()->count())->toBe(1);
});

it('registers the same movement only once when the idempotency key repeats', function () {
    $item = inventoryItem($this->hotel);
    $payload = inventoryMovementPayload('entrada', 8, 'same-key');

    $this->actingAs($this->user)
        ->post("/inventory/items/{$item->id}/movements", $payload)
        ->assertSessionHasNoErrors();

    $this->actingAs($this->user)
        ->post("/inventory/items/{$item->id}/movements", $payload)
        ->assertSessionHasNoErrors();

    expect($item->fresh()->movements()->count())->toBe(1)
        ->and((float) $item->fresh()->stock)->toBe(8.0);
});

it('registers a physical count adjustment as a signed delta', function () {
    $item = inventoryItem($this->hotel);

    $this->actingAs($this->user)
        ->post("/inventory/items/{$item->id}/movements", inventoryMovementPayload('entrada', 10))
        ->assertSessionHasNoErrors();

    $this->actingAs($this->user)
        ->post("/inventory/items/{$item->id}/movements", [
            'type' => 'ajuste',
            'counted_stock' => 7,
            'reason' => 'Conteo físico mensual',
            'occurred_at' => now()->toDateString(),
            'idempotency_key' => 'adjust-1',
        ])
        ->assertSessionHasNoErrors();

    $adjustment = $item->fresh()->movements()->where('type', 'ajuste')->firstOrFail();

    expect((float) $adjustment->quantity)->toBe(-3.0)
        ->and((float) $item->fresh()->stock)->toBe(7.0);

    $this->actingAs($this->user)
        ->post("/inventory/items/{$item->id}/movements", [
            'type' => 'ajuste',
            'counted_stock' => 7,
            'reason' => 'Sin cambios',
            'occurred_at' => now()->toDateString(),
        ])
        ->assertSessionHasErrors('counted_stock');

    $this->actingAs($this->user)
        ->post("/inventory/items/{$item->id}/movements", [
            'type' => 'ajuste',
            'counted_stock' => 4,
            'occurred_at' => now()->toDateString(),
        ])
        ->assertSessionHasErrors('reason');
});

it('voids a movement through a reversal and keeps history', function () {
    $item = inventoryItem($this->hotel);

    $this->actingAs($this->user)
        ->post("/inventory/items/{$item->id}/movements", inventoryMovementPayload('entrada', 10))
        ->assertSessionHasNoErrors();

    $movement = InventoryMovement::query()->firstOrFail();

    $this->actingAs($this->user)
        ->post("/inventory/movements/{$movement->id}/void", ['reason' => 'Compra duplicada'])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $movement->refresh();
    $reversal = InventoryMovement::query()->where('reversal_of_id', $movement->id)->firstOrFail();

    expect($movement->voided_at)->not->toBeNull()
        ->and($movement->void_reason)->toBe('Compra duplicada')
        ->and($movement->voided_by)->toBe($this->user->id)
        ->and((float) $reversal->quantity)->toBe(-10.0)
        ->and($reversal->type)->toBe('salida')
        ->and((float) $item->fresh()->stock)->toBe(0.0);

    $this->actingAs($this->user)
        ->post("/inventory/movements/{$movement->id}/void", ['reason' => 'Otra vez'])
        ->assertSessionHasErrors('movement');
});

it('blocks voiding an entry when the reversal would leave negative stock', function () {
    $item = inventoryItem($this->hotel);

    $this->actingAs($this->user)
        ->post("/inventory/items/{$item->id}/movements", inventoryMovementPayload('entrada', 10))
        ->assertSessionHasNoErrors();

    $this->actingAs($this->user)
        ->post("/inventory/items/{$item->id}/movements", inventoryMovementPayload('salida', 8, 'exit-key'))
        ->assertSessionHasNoErrors();

    $entry = $item->fresh()->movements()->where('type', 'entrada')->firstOrFail();

    $this->actingAs($this->user)
        ->post("/inventory/movements/{$entry->id}/void", ['reason' => 'Error'])
        ->assertSessionHasErrors('movement');

    expect((float) $item->fresh()->stock)->toBe(2.0);
});

it('rejects movements on inactive items', function () {
    $item = inventoryItem($this->hotel, ['active' => false]);

    $this->actingAs($this->user)
        ->post("/inventory/items/{$item->id}/movements", inventoryMovementPayload('entrada', 5))
        ->assertSessionHasErrors('inventory_item_id');

    expect((float) $item->fresh()->stock)->toBe(0.0);
});

it('forbids roles without the inventory manage permission', function () {
    $item = inventoryItem($this->hotel);
    $reception = inventoryActor($this->hotel, 'recepcion');

    $this->actingAs($reception)
        ->post('/inventory/items', [
            'name' => 'No permitido',
            'category' => 'otro',
            'unit' => 'unidad',
        ])
        ->assertForbidden();

    $this->actingAs($reception)
        ->post("/inventory/items/{$item->id}/movements", inventoryMovementPayload('entrada', 5))
        ->assertForbidden();
});

it('does not expose inventory from another hotel', function () {
    $otherHotel = Hotel::factory()->create(['name' => 'Hotel Sur']);

    app(CurrentHotel::class)->set($otherHotel->id);
    $otherItem = inventoryItem($otherHotel, ['name' => 'Artículo externo']);
    app(CurrentHotel::class)->set($this->hotel->id);

    $this->actingAs($this->user)
        ->get('/inventory')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('items.data', 0)
            ->has('movements.data', 0)
            ->has('alerts', 0));

    $this->actingAs($this->user)
        ->post("/inventory/items/{$otherItem->id}/movements", inventoryMovementPayload('entrada', 5))
        ->assertNotFound();

    expect((float) $otherItem->fresh()->stock)->toBe(0.0);
});

it('shows system activity from every permitted module', function () {
    $modules = [
        'reception' => 'check_in',
        'finance' => 'payment_registered',
        'billing' => 'bill_created',
        'services' => 'request_created',
        'employees' => 'employee_created',
        'inventory' => 'item_created',
    ];

    foreach ($modules as $module => $action) {
        inventoryActivity($this->hotel, [
            'user_id' => $this->user->id,
            'module' => $module,
            'action' => $action,
            'description' => "Actividad de {$module}",
        ]);
    }

    $this->actingAs($this->user)
        ->get('/inventory?tab=movimientos&activity_scope=sistema')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Inventory/Index')
            ->where('filters.activity_scope', 'sistema')
            ->has('activity.data', 6)
            ->has('options.activityModules', 6)
            ->where('activity.data', function (iterable $rows) use ($modules): bool {
                $seen = collect($rows)
                    ->map(fn ($row): string => (string) $row['module'])
                    ->all();
                $expected = array_keys($modules);

                sort($seen);
                sort($expected);

                return $seen === $expected;
            }));
});

it('filters system activity by module', function () {
    inventoryActivity($this->hotel, [
        'module' => 'inventory',
        'action' => 'item_created',
        'description' => 'Artículo creado',
    ]);
    inventoryActivity($this->hotel, [
        'module' => 'finance',
        'action' => 'payment_registered',
        'description' => 'Cobro registrado',
    ]);

    $this->actingAs($this->user)
        ->get('/inventory?tab=movimientos&activity_scope=sistema&activity_module=finance')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('filters.activity_module', 'finance')
            ->has('activity.data', 1)
            ->where('activity.data.0.module', 'finance')
            ->where('activity.data.0.actionLabel', 'Cobro registrado'));
});

it('limits system activity to modules the role can read', function () {
    inventoryActivity($this->hotel, ['module' => 'inventory']);
    inventoryActivity($this->hotel, ['module' => 'finance']);
    inventoryActivity($this->hotel, ['module' => 'reception']);

    $inventory = inventoryActor($this->hotel, 'inventario');

    $this->actingAs($inventory)
        ->get('/inventory?tab=movimientos&activity_scope=sistema&activity_module=finance')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('filters.activity_module', '')
            ->has('activity.data', 1)
            ->where('activity.data.0.module', 'inventory')
            ->has('options.activityModules', 1)
            ->where('options.activityModules.0.value', 'inventory')
            ->where('options.activityModules.0.label', 'Inventario'));
});

it('does not show system activity from another hotel', function () {
    inventoryActivity($this->hotel, ['module' => 'inventory']);

    $otherHotel = Hotel::factory()->create(['name' => 'Hotel Sur']);
    inventoryActivity($otherHotel, ['module' => 'finance']);

    $this->actingAs($this->user)
        ->get('/inventory?tab=movimientos&activity_scope=sistema')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('activity.data', 1));
});
