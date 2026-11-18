<?php

use App\Models\Hotel;
use App\Models\User;
use App\Support\CurrentHotel;
use App\Support\Permission;
use App\Support\Role;
use Illuminate\Support\Facades\Gate;

/**
 * Creates a user attached to the given hotel with a single role.
 */
function roleUser(Hotel $hotel, string $role): User
{
    $user = User::factory()->create();

    $user->hotels()->sync([$hotel->id => ['role' => $role]]);

    return $user;
}

beforeEach(function () {
    $this->hotel = useCurrentHotel();
});

test('owners and admins hold every permission', function (string $role) {
    $user = roleUser($this->hotel, $role);

    foreach (Permission::cases() as $permission) {
        expect($user->hasPermission($permission))->toBeTrue();
    }

    expect($user->permissionValues())->toHaveCount(count(Permission::cases()));
})->with(['owner', 'admin']);

test('the reception role only reaches its own modules', function () {
    $user = roleUser($this->hotel, 'recepcion');

    expect($user->hasPermission(Permission::ReceptionView))->toBeTrue()
        ->and($user->hasPermission(Permission::ReceptionOperate))->toBeTrue()
        ->and($user->hasPermission(Permission::ServicesView))->toBeTrue()
        ->and($user->hasPermission(Permission::ReportsView))->toBeTrue()
        ->and($user->hasPermission(Permission::FinanceView))->toBeFalse()
        ->and($user->hasPermission(Permission::InventoryView))->toBeFalse()
        ->and($user->hasPermission(Permission::EmployeesView))->toBeFalse()
        ->and($user->hasPermission(Permission::ReportsExport))->toBeFalse();
});

test('the finance role cannot operate inventory or employees', function () {
    $user = roleUser($this->hotel, 'finanzas');

    expect($user->hasPermission(Permission::FinanceManage))->toBeTrue()
        ->and($user->hasPermission(Permission::FinanceVoid))->toBeTrue()
        ->and($user->hasPermission(Permission::ServicesBill))->toBeTrue()
        ->and($user->hasPermission(Permission::InventoryManage))->toBeFalse()
        ->and($user->hasPermission(Permission::EmployeesManage))->toBeFalse()
        ->and($user->hasPermission(Permission::ReceptionOperate))->toBeFalse();
});

test('gates resolve the role of the current hotel', function () {
    app(CurrentHotel::class)->set($this->hotel->id);

    $reception = roleUser($this->hotel, 'recepcion');
    $finance = roleUser($this->hotel, 'finanzas');

    expect(Gate::forUser($reception)->allows('reception.operate'))->toBeTrue()
        ->and(Gate::forUser($reception)->allows('finance.manage'))->toBeFalse()
        ->and(Gate::forUser($finance)->allows('finance.manage'))->toBeTrue()
        ->and(Gate::forUser($finance)->allows('inventory.adjust'))->toBeFalse();
});

test('users without a role have no permissions', function () {
    $stranger = User::factory()->create();
    $stranger->hotels()->sync([]);

    expect($stranger->roleIn($this->hotel))->toBeNull()
        ->and($stranger->hasPermission(Permission::ReceptionView))->toBeFalse()
        ->and($stranger->permissionValues())->toBe([]);
});

test('unknown role values grant nothing instead of failing', function () {
    $user = roleUser($this->hotel, 'auditor');

    expect($user->roleEnumIn($this->hotel))->toBeNull()
        ->and($user->hasPermission(Permission::ReportsView))->toBeFalse();
});

test('roles grant different abilities per hotel', function () {
    $second = Hotel::factory()->create(['name' => 'Hotel Sur']);

    $user = User::factory()->create();
    $user->hotels()->sync([
        $this->hotel->id => ['role' => 'finanzas'],
        $second->id => ['role' => 'owner'],
    ]);

    expect($user->hasPermission(Permission::FinanceManage, $this->hotel))->toBeTrue()
        ->and($user->hasPermission(Permission::EmployeesManage, $this->hotel))->toBeFalse()
        ->and($user->hasPermission(Permission::EmployeesManage, $second))->toBeTrue();
});

test('the current role is memoized until the cache is cleared', function () {
    $user = roleUser($this->hotel, 'recepcion');

    expect($user->roleIn($this->hotel))->toBe('recepcion');

    $user->hotels()->sync([$this->hotel->id => ['role' => 'admin']]);

    // The cached value survives until explicitly invalidated.
    expect($user->roleIn($this->hotel))->toBe('recepcion');

    $user->forgetRoleCache();

    expect($user->roleIn($this->hotel))->toBe('admin');
});

test('permissions and role are shared with inertia', function () {
    $user = roleUser($this->hotel, 'finanzas');

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page
            ->where('auth.role', 'finanzas')
            ->where('auth.roleLabel', 'Finanzas')
            ->where('auth.permissions', fn ($permissions) => $permissions->contains('finance.manage')
                && ! $permissions->contains('inventory.manage')));
});

test('switching the current hotel switches the shared permissions', function () {
    $second = Hotel::factory()->create(['name' => 'Hotel Sur']);

    $user = User::factory()->create();
    $user->hotels()->sync([
        $this->hotel->id => ['role' => 'recepcion'],
        $second->id => ['role' => 'owner'],
    ]);

    $this->actingAs($user)
        ->withSession(['current_hotel_id' => $second->id])
        ->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page
            ->where('auth.role', 'owner')
            ->where('auth.permissions', fn ($permissions) => $permissions->contains('employees.manage')));
});

test('guests receive an empty permission list', function () {
    $this->get(route('home'))
        ->assertInertia(fn ($page) => $page
            ->where('auth.permissions', [])
            ->where('auth.role', null));
});

test('role labels are translated', function () {
    expect(Role::Reception->label())->toBe('Recepción')
        ->and(Role::Finance->label())->toBe('Finanzas')
        ->and(Role::Inventory->label())->toBe('Inventario')
        ->and(Role::Services->label())->toBe('Servicios')
        ->and(Role::HumanResources->label())->toBe('Recursos Humanos');
});
