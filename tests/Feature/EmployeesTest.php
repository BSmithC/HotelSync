<?php

use App\Models\AuditLog;
use App\Models\Employee;
use App\Models\Hotel;
use App\Models\User;
use App\Services\EmployeeService;
use App\Support\CurrentHotel;

beforeEach(function () {
    $this->hotel = useCurrentHotel();
    $this->user = User::factory()->create();
});

function employeesActor(Hotel $hotel, string $role): User
{
    $user = User::factory()->create();
    $user->hotels()->sync([$hotel->id => ['role' => $role]]);

    return $user;
}

/**
 * @param  array<string, mixed>  $attributes
 */
function employeeRecord(Hotel $hotel, array $attributes = []): Employee
{
    return Employee::create([
        'hotel_id' => $hotel->id,
        'first_name' => 'María',
        'last_name' => 'Rodríguez',
        'position' => 'Recepcionista',
        'department' => 'recepcion',
        'hire_date' => now()->subYear()->toDateString(),
        'status' => Employee::ACTIVO,
        ...$attributes,
    ]);
}

/**
 * @param  array<string, mixed>  $attributes
 * @return array<string, mixed>
 */
function employeePayload(array $attributes = []): array
{
    return [
        'first_name' => 'Luis',
        'last_name' => 'Peralta',
        'position' => 'Camarero',
        'department' => 'alimentos_bebidas',
        'hire_date' => now()->toDateString(),
        'status' => Employee::ACTIVO,
        'cedula' => '001-0000001-1',
        'birth_date' => '1995-04-12',
        'phone' => '8095551234',
        'email' => 'Luis@Example.com',
        'address' => 'Calle Duarte 12',
        'salary' => 25000,
        'bank_account' => '123456789',
        'emergency_contact_name' => 'Ana Peralta',
        'emergency_contact_phone' => '8095559999',
        'notes' => 'Sin alergias conocidas',
        ...$attributes,
    ];
}

it('redirects guests to the login screen', function () {
    $this->get('/employees')->assertRedirect('/login');
});

it('forbids roles without the employees permission', function () {
    $reception = employeesActor($this->hotel, 'recepcion');

    $this->actingAs($reception)->get('/employees')->assertForbidden();

    $humanResources = employeesActor($this->hotel, 'rrhh');

    $this->actingAs($humanResources)->get('/employees')->assertOk();
});

it('renders the employee directory with indicators and filters', function () {
    employeeRecord($this->hotel, [
        'first_name' => 'Ana',
        'last_name' => 'Gómez',
        'department' => 'housekeeping',
        'status' => Employee::ACTIVO,
        'cedula' => '001-0000002-2',
    ]);

    employeeRecord($this->hotel, [
        'first_name' => 'Pedro',
        'last_name' => 'Núñez',
        'department' => 'mantenimiento',
        'status' => Employee::INACTIVO,
    ]);

    $this->actingAs($this->user)
        ->get('/employees?tab=directorio&department=housekeeping')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Employees/Index')
            ->where('filters.tab', 'directorio')
            ->where('filters.department', 'housekeeping')
            ->where('kpis.active', 1)
            ->where('kpis.inactive', 1)
            ->has('employees.data', 1)
            ->where('employees.data.0.first_name', 'Ana')
            ->where('permissions.manage', true)
            ->where('permissions.sensitive', true));
});

it('searches the directory by protected data only when it is visible', function () {
    employeeRecord($this->hotel, [
        'first_name' => 'Ana',
        'last_name' => 'Gómez',
        'cedula' => '402-1234567-8',
    ]);

    $this->actingAs($this->user)
        ->get('/employees?tab=directorio&search=402-1234567-8')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('employees.data', 1)
            ->where('employees.data.0.first_name', 'Ana'));
});

it('hides sensitive attributes unless they are explicitly revealed', function () {
    $employee = employeeRecord($this->hotel, [
        'cedula' => '001-0000003-3',
        'salary' => 18000,
        'bank_account' => '999888777',
    ]);

    $serialized = $employee->toArray();

    expect($serialized)->not->toHaveKey('cedula')
        ->not->toHaveKey('salary')
        ->not->toHaveKey('bank_account')
        ->not->toHaveKey('notes');

    $employee->makeVisible(Employee::SENSITIVE_FIELDS);

    expect($employee->toArray())->toHaveKey('cedula')
        ->toHaveKey('salary');
});

it('registers an employee without creating a user account', function () {
    $usersBefore = User::query()->count();

    $this->actingAs($this->user)
        ->post('/employees', employeePayload())
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $employee = Employee::query()->firstOrFail();

    expect($employee->user_id)->toBeNull()
        ->and($employee->first_name)->toBe('Luis')
        ->and($employee->email)->toBe('luis@example.com')
        ->and((float) $employee->salary)->toBe(25000.0)
        ->and(User::query()->count())->toBe($usersBefore);

    $log = AuditLog::query()->where('action', 'employee_created')->firstOrFail();
    $encoded = json_encode($log->changes, JSON_UNESCAPED_UNICODE);

    expect($log->module)->toBe('employees')
        ->and($log->subject_id)->toBe($employee->id)
        ->and($encoded)->toContain('cedula')
        ->not->toContain('001-0000001-1')
        ->not->toContain('25000')
        ->not->toContain('Luis@Example.com');
});

it('ignores sensitive fields when the actor lacks the sensitive ability', function () {
    $employee = app(EmployeeService::class)->create(
        employeePayload(['cedula' => '001-0000004-4']),
        $this->user,
        false,
    );

    expect($employee->cedula)->toBeNull()
        ->and($employee->salary)->toBeNull()
        ->and($employee->notes)->toBeNull()
        ->and($employee->first_name)->toBe('Luis')
        ->and($employee->position)->toBe('Camarero');
});

it('rejects a duplicate cedula inside the same hotel', function () {
    employeeRecord($this->hotel, ['cedula' => '001-0000005-5']);

    $this->actingAs($this->user)
        ->post('/employees', employeePayload(['cedula' => '001-0000005-5']))
        ->assertSessionHasErrors('cedula');

    expect(Employee::query()->count())->toBe(1);
});

it('updates basic data without erasing sensitive data', function () {
    $employee = employeeRecord($this->hotel, [
        'cedula' => '001-0000006-6',
        'salary' => 18000,
        'bank_account' => '999888777',
        'notes' => 'Expediente completo',
    ]);

    $this->actingAs($this->user)
        ->patch("/employees/{$employee->id}", [
            'first_name' => 'María Elena',
            'last_name' => 'Rodríguez',
            'position' => 'Supervisora de recepción',
            'department' => 'recepcion',
            'hire_date' => $employee->hire_date->toDateString(),
            'status' => Employee::ACTIVO,
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $employee->refresh();

    expect($employee->first_name)->toBe('María Elena')
        ->and($employee->position)->toBe('Supervisora de recepción')
        ->and($employee->cedula)->toBe('001-0000006-6')
        ->and((float) $employee->salary)->toBe(18000.0)
        ->and($employee->bank_account)->toBe('999888777')
        ->and($employee->notes)->toBe('Expediente completo');

    $log = AuditLog::query()->where('action', 'employee_updated')->firstOrFail();

    expect($log->changes['before']['position'])->toBe('Recepcionista')
        ->and($log->changes['after']['position'])->toBe('Supervisora de recepción')
        ->and($log->changes['sensitive_fields_changed'])->toBe([]);
});

it('deactivates an employee without deleting the record', function () {
    $employee = employeeRecord($this->hotel);

    $this->actingAs($this->user)
        ->patch("/employees/{$employee->id}", [
            'first_name' => $employee->first_name,
            'last_name' => $employee->last_name,
            'position' => $employee->position,
            'department' => $employee->department,
            'hire_date' => $employee->hire_date->toDateString(),
            'status' => Employee::INACTIVO,
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $employee->refresh();

    expect($employee->status)->toBe(Employee::INACTIVO)
        ->and(Employee::query()->whereKey($employee->id)->exists())->toBeTrue();

    $log = AuditLog::query()->where('action', 'employee_updated')->firstOrFail();

    expect($log->changes['before']['status'])->toBe(Employee::ACTIVO)
        ->and($log->changes['after']['status'])->toBe(Employee::INACTIVO);
});

it('links an existing user account with a hotel role', function () {
    $employee = employeeRecord($this->hotel);
    $target = employeesActor($this->hotel, 'recepcion');

    $this->actingAs($this->user)
        ->post("/employees/{$employee->id}/access", [
            'user_id' => $target->id,
            'role' => 'finanzas',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $employee->refresh();
    $target->forgetRoleCache();

    expect($employee->user_id)->toBe($target->id)
        ->and($target->roleIn($this->hotel))->toBe('finanzas');

    $log = AuditLog::query()->where('action', 'access_linked')->firstOrFail();

    expect($log->changes['role']['before'])->toBe('recepcion')
        ->and($log->changes['role']['after'])->toBe('finanzas');
});

it('revokes access but keeps the employee record', function () {
    $target = employeesActor($this->hotel, 'recepcion');
    $employee = employeeRecord($this->hotel, ['user_id' => $target->id]);

    $this->actingAs($this->user)
        ->delete("/employees/{$employee->id}/access")
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $employee->refresh();

    expect($employee->user_id)->toBeNull()
        ->and(Employee::query()->whereKey($employee->id)->exists())->toBeTrue()
        ->and($target->fresh()->hotels()->whereKey($this->hotel->id)->exists())->toBeFalse();
});

it('prevents an actor from changing their own access', function () {
    $employee = employeeRecord($this->hotel);

    $this->actingAs($this->user)
        ->post("/employees/{$employee->id}/access", [
            'user_id' => $this->user->id,
            'role' => 'admin',
        ])
        ->assertSessionHasErrors('user_id');

    expect($employee->refresh()->user_id)->toBeNull();
});

it('prevents an actor from revoking their own access', function () {
    $employee = employeeRecord($this->hotel, ['user_id' => $this->user->id]);

    $this->actingAs($this->user)
        ->delete("/employees/{$employee->id}/access")
        ->assertSessionHasErrors('access');

    expect($employee->refresh()->user_id)->toBe($this->user->id);
});

it('keeps at least one owner with access to the hotel', function () {
    $otherHotel = Hotel::factory()->create();
    app(CurrentHotel::class)->set($otherHotel->id);

    $owner = User::factory()->create();
    $owner->hotels()->sync([$otherHotel->id => ['role' => 'owner']]);

    $employee = employeeRecord($otherHotel, ['user_id' => $owner->id]);
    $humanResources = employeesActor($otherHotel, 'rrhh');

    $this->actingAs($humanResources)
        ->delete("/employees/{$employee->id}/access")
        ->assertSessionHasErrors('role');

    expect($employee->refresh()->user_id)->toBe($owner->id)
        ->and($owner->fresh()->hotels()->whereKey($otherHotel->id)->exists())->toBeTrue();

    app(CurrentHotel::class)->set($this->hotel->id);
});

it('does not expose or modify employees from another hotel', function () {
    $otherHotel = Hotel::factory()->create();
    $foreign = employeeRecord($otherHotel, ['first_name' => 'Ajeno']);

    $this->actingAs($this->user)
        ->get('/employees?tab=directorio')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('employees.data', 0));

    $this->actingAs($this->user)
        ->patch("/employees/{$foreign->id}", [
            'first_name' => 'Intruso',
            'last_name' => 'Externo',
            'position' => 'Cargo',
            'department' => 'otro',
            'hire_date' => now()->toDateString(),
            'status' => Employee::ACTIVO,
        ])
        ->assertNotFound();

    expect($foreign->fresh()->first_name)->toBe('Ajeno');
});

it('lists only users of the current hotel as access candidates', function () {
    $otherHotel = Hotel::factory()->create();
    $outsider = User::factory()->create();
    $outsider->hotels()->sync([$otherHotel->id => ['role' => 'admin']]);

    $this->actingAs($this->user)
        ->get('/employees')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('availableUsers', fn ($users) => collect($users)
                ->pluck('id')
                ->doesntContain($outsider->id))
            ->where('availableUsers', fn ($users) => collect($users)
                ->pluck('id')
                ->contains($this->user->id)));
});
