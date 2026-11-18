<?php

use App\Models\AuditLog;
use App\Models\Hotel;
use App\Models\User;
use App\Services\AuditLogger;
use App\Support\CurrentHotel;

beforeEach(function () {
    $this->hotel = useCurrentHotel();
    $this->user = User::factory()->create();
});

test('an audit record captures hotel, user, subject and ip', function () {
    $this->actingAs($this->user);

    $subject = User::factory()->create();

    $log = app(AuditLogger::class)->record(
        module: 'employees',
        action: 'created',
        subject: $subject,
        description: 'Alta de empleado',
        changes: ['name' => 'Ana Pérez'],
    );

    expect($log->exists)->toBeTrue()
        ->and($log->hotel_id)->toBe($this->hotel->id)
        ->and($log->user_id)->toBe($this->user->id)
        ->and($log->module)->toBe('employees')
        ->and($log->action)->toBe('created')
        ->and($log->subject_type)->toBe($subject->getMorphClass())
        ->and($log->subject_id)->toBe($subject->id)
        ->and($log->changes)->toBe(['name' => 'Ana Pérez'])
        ->and($log->ip)->not->toBeNull();
});

test('sensitive keys are stripped from the payload', function () {
    $log = app(AuditLogger::class)->record(
        module: 'employees',
        action: 'updated',
        description: 'Actualización',
        changes: [
            'name' => 'Ana',
            'password' => 'super-secret',
            'password_confirmation' => 'super-secret',
            'profile' => [
                'phone' => '8090000000',
                'remember_token' => 'abc',
            ],
        ],
    );

    expect($log->changes)->toBe([
        'name' => 'Ana',
        'profile' => ['phone' => '8090000000'],
    ]);
});

test('empty changes are stored as null', function () {
    $log = app(AuditLogger::class)->record('finance', 'viewed');

    expect($log->changes)->toBeNull()
        ->and($log->description)->toBeNull()
        ->and($log->subject_type)->toBeNull()
        ->and($log->subject_id)->toBeNull();
});

test('audit records are isolated per hotel', function () {
    app(AuditLogger::class)->record('inventory', 'entry', null, 'Entrada');

    $second = Hotel::factory()->create(['name' => 'Hotel Sur']);
    app(CurrentHotel::class)->set($second->id);

    expect(AuditLog::query()->count())->toBe(0);

    app(CurrentHotel::class)->set($this->hotel->id);

    expect(AuditLog::query()->count())->toBe(1);
});

test('audit records belong to their author and subject', function () {
    $this->actingAs($this->user);

    $subject = User::factory()->create();

    $log = app(AuditLogger::class)->record('employees', 'updated', $subject);

    expect($log->user->is($this->user))->toBeTrue()
        ->and($log->subject->is($subject))->toBeTrue();
});

test('recordChanges stores only the reported changes', function () {
    $subject = User::factory()->create();

    $log = app(AuditLogger::class)->recordChanges(
        module: 'reception',
        action: 'check_in',
        subject: $subject,
        changes: ['status' => ['Confirmada', 'En curso']],
        description: 'Check-in registrado',
    );

    expect($log->changes)->toBe(['status' => ['Confirmada', 'En curso']])
        ->and($log->description)->toBe('Check-in registrado');
});
