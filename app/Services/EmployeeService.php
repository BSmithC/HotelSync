<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\Hotel;
use App\Models\User;
use App\Support\CurrentHotel;
use App\Support\Role;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Employee operations with a privacy-first contract.
 *
 * Rules enforced here (never only in the frontend):
 * - every write runs inside a transaction and locks the employee row;
 * - creating an employee never creates a login account;
 * - sensitive fields are only written when the actor holds
 *   `employees.sensitive`, and audit entries never store their values;
 * - linking or revoking access is a separate ability (`employees.access`);
 * - the last owner of the hotel cannot lose access by accident;
 * - employees are never deleted, only moved to the `inactivo` status.
 */
class EmployeeService
{
    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data, User $actor, bool $canSensitive): Employee
    {
        return DB::transaction(function () use ($data, $canSensitive): Employee {
            $basic = $this->basicAttributes($data);
            $sensitive = $canSensitive ? $this->sensitiveAttributes($data) : [];

            try {
                $employee = Employee::create([
                    ...$basic,
                    ...$sensitive,
                ]);
            } catch (UniqueConstraintViolationException) {
                throw ValidationException::withMessages([
                    'cedula' => 'Ya existe un empleado con esa cédula en este hotel.',
                ]);
            }

            $this->audit->record(
                module: 'employees',
                action: 'employee_created',
                subject: $employee,
                description: "Empleado registrado: {$employee->fullName()}",
                changes: [
                    ...$this->auditBasics($employee),
                    'sensitive_fields' => $this->filledSensitiveFields($employee),
                ],
            );

            return $employee->refresh();
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(
        Employee $employee,
        array $data,
        User $actor,
        bool $canSensitive,
    ): Employee {
        return DB::transaction(function () use ($employee, $data, $canSensitive): Employee {
            $employee = Employee::query()->lockForUpdate()->findOrFail((int) $employee->getKey());

            // Capture the previous state before save(), because getOriginal()
            // returns the new values once the model has been persisted.
            $before = $this->auditBasics($employee);

            $employee->fill($this->basicAttributes($data, $employee));

            if ($canSensitive) {
                // Only touch sensitive fields present in the payload so a
                // partial update (or an actor without the ability) never
                // erases data that was not part of the request.
                $employee->fill(array_intersect_key(
                    $this->sensitiveAttributes($data),
                    $data,
                ));
            }

            try {
                $employee->save();
            } catch (UniqueConstraintViolationException) {
                throw ValidationException::withMessages([
                    'cedula' => 'Ya existe un empleado con esa cédula en este hotel.',
                ]);
            }

            $changedSensitive = array_values(array_filter(
                Employee::SENSITIVE_FIELDS,
                fn (string $field): bool => $employee->wasChanged($field),
            ));

            $this->audit->record(
                module: 'employees',
                action: 'employee_updated',
                subject: $employee,
                description: "Empleado actualizado: {$employee->fullName()}",
                changes: [
                    'before' => $before,
                    'after' => $this->auditBasics($employee),
                    'sensitive_fields_changed' => $changedSensitive,
                ],
            );

            return $employee->refresh();
        });
    }

    /**
     * Link an existing platform user to the employee and grant them a role in
     * the hotel. The user is never created here.
     */
    public function linkAccess(
        Employee $employee,
        User $target,
        string $role,
        User $actor,
    ): Employee {
        return DB::transaction(function () use ($employee, $target, $role, $actor): Employee {
            $employee = Employee::query()->lockForUpdate()->findOrFail((int) $employee->getKey());
            $hotel = app(CurrentHotel::class)->model();

            if ($hotel === null) {
                throw ValidationException::withMessages([
                    'user_id' => 'No hay un hotel activo para asignar el acceso.',
                ]);
            }

            $roleEnum = Role::tryFrom($role);

            if ($roleEnum === null) {
                throw ValidationException::withMessages([
                    'role' => 'El rol seleccionado no es válido.',
                ]);
            }

            if ((int) $target->id === (int) $actor->id) {
                throw ValidationException::withMessages([
                    'user_id' => 'No puedes cambiar tu propio acceso desde Empleados.',
                ]);
            }

            $alreadyLinked = Employee::query()
                ->where('user_id', $target->id)
                ->where('id', '!=', $employee->id)
                ->exists();

            if ($alreadyLinked) {
                throw ValidationException::withMessages([
                    'user_id' => 'Ese usuario ya está vinculado a otro empleado del hotel.',
                ]);
            }

            $this->assertOwnerSafety($hotel, $target, $roleEnum);
            $previousRole = $target->roleIn($hotel);

            try {
                $target->hotels()->syncWithoutDetaching([
                    $hotel->id => ['role' => $roleEnum->value],
                ]);
            } catch (UniqueConstraintViolationException) {
                throw ValidationException::withMessages([
                    'user_id' => 'Ese usuario ya está vinculado a otro empleado del hotel.',
                ]);
            }

            $employee->forceFill(['user_id' => $target->id])->save();
            $target->forgetRoleCache();

            $this->audit->record(
                module: 'employees',
                action: 'access_linked',
                subject: $employee,
                description: "Acceso vinculado para {$employee->fullName()}",
                changes: [
                    'user_id' => $target->id,
                    'role' => [
                        'before' => $previousRole,
                        'after' => $roleEnum->value,
                    ],
                ],
            );

            return $employee->refresh();
        });
    }

    /**
     * Revoke the hotel access of the linked user and clear the employee link.
     */
    public function revokeAccess(Employee $employee, User $actor): Employee
    {
        return DB::transaction(function () use ($employee, $actor): Employee {
            $employee = Employee::query()->lockForUpdate()->findOrFail((int) $employee->getKey());
            $hotel = app(CurrentHotel::class)->model();

            if ($employee->user_id === null) {
                throw ValidationException::withMessages([
                    'access' => 'El empleado no tiene un acceso vinculado.',
                ]);
            }

            $target = User::query()->find($employee->user_id);

            if ($target === null) {
                $employee->forceFill(['user_id' => null])->save();

                return $employee->refresh();
            }

            if ((int) $target->id === (int) $actor->id) {
                throw ValidationException::withMessages([
                    'access' => 'No puedes quitarte tu propio acceso desde Empleados.',
                ]);
            }

            if ($hotel !== null) {
                $this->assertOwnerSafety($hotel, $target, null);
                $target->hotels()->detach($hotel->id);
                $target->forgetRoleCache();
            }

            $employee->forceFill(['user_id' => null])->save();

            $this->audit->record(
                module: 'employees',
                action: 'access_revoked',
                subject: $employee,
                description: "Acceso revocado para {$employee->fullName()}",
                changes: [
                    'user_id' => $target->id,
                ],
            );

            return $employee->refresh();
        });
    }

    /**
     * Prevent leaving the hotel without an owner.
     */
    private function assertOwnerSafety(Hotel $hotel, User $target, ?Role $newRole): void
    {
        if ($target->roleIn($hotel) !== Role::Owner->value) {
            return;
        }

        if ($newRole === Role::Owner) {
            return;
        }

        $owners = $hotel->users()
            ->wherePivot('role', Role::Owner->value)
            ->count();

        if ($owners <= 1) {
            throw ValidationException::withMessages([
                'role' => 'El hotel debe conservar al menos un propietario con acceso.',
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function basicAttributes(array $data, ?Employee $employee = null): array
    {
        return [
            'first_name' => $this->clean($data['first_name'] ?? null, 80),
            'last_name' => $this->clean($data['last_name'] ?? null, 80),
            'position' => $this->clean($data['position'] ?? null, 80),
            'department' => $data['department'] ?? $employee->department ?? 'otro',
            'hire_date' => $data['hire_date'] ?? $employee?->hire_date?->toDateString(),
            'status' => $data['status'] ?? $employee->status ?? Employee::ACTIVO,
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function sensitiveAttributes(array $data): array
    {
        return [
            'cedula' => $this->clean($data['cedula'] ?? null, 20),
            'birth_date' => $this->date($data['birth_date'] ?? null),
            'phone' => $this->clean($data['phone'] ?? null, 30),
            'email' => $this->email($data['email'] ?? null),
            'address' => $this->clean($data['address'] ?? null, 200),
            'salary' => $this->money($data['salary'] ?? null),
            'bank_account' => $this->clean($data['bank_account'] ?? null, 60),
            'emergency_contact_name' => $this->clean($data['emergency_contact_name'] ?? null, 120),
            'emergency_contact_phone' => $this->clean($data['emergency_contact_phone'] ?? null, 30),
            'notes' => $this->clean($data['notes'] ?? null, 1000),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function auditBasics(Employee $employee): array
    {
        return [
            'first_name' => $employee->first_name,
            'last_name' => $employee->last_name,
            'position' => $employee->position,
            'department' => $employee->department,
            'hire_date' => $employee->hire_date->toDateString(),
            'status' => $employee->status,
            'has_access' => $employee->user_id !== null,
        ];
    }

    /**
     * Names of the sensitive fields that hold a value, never the values.
     *
     * @return list<string>
     */
    private function filledSensitiveFields(Employee $employee): array
    {
        return array_values(array_filter(
            Employee::SENSITIVE_FIELDS,
            fn (string $field): bool => $employee->getAttribute($field) !== null
                && $employee->getAttribute($field) !== '',
        ));
    }

    private function clean(mixed $value, int $limit): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = trim($value);

        return $value === '' ? null : mb_substr($value, 0, $limit);
    }

    private function email(mixed $value): ?string
    {
        $value = $this->clean($value, 120);

        return $value === null ? null : mb_strtolower($value);
    }

    private function money(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        return round((float) $value, 2);
    }

    private function date(mixed $value): ?string
    {
        $value = $this->clean($value, 10);

        return $value === null ? null : $value;
    }
}
