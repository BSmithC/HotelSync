<?php

namespace App\Models;

use App\Models\Concerns\BelongsToHotel;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A hotel employee.
 *
 * Employees are people, not accounts: a record exists without a user login.
 * Sensitive fields (identity, contact, salary, bank and health/notes) are
 * hidden by default and only exposed when the actor holds
 * `employees.sensitive`. The application never hard-deletes an employee:
 * leaving the hotel is represented by the `inactivo` status.
 *
 * @property int $id
 * @property int|null $hotel_id
 * @property int|null $user_id
 * @property string $first_name
 * @property string $last_name
 * @property string|null $cedula
 * @property CarbonImmutable|null $birth_date
 * @property string|null $phone
 * @property string|null $email
 * @property string|null $address
 * @property string $position
 * @property string $department
 * @property CarbonImmutable $hire_date
 * @property string $status
 * @property string|null $salary
 * @property string|null $bank_account
 * @property string|null $emergency_contact_name
 * @property string|null $emergency_contact_phone
 * @property string|null $notes
 * @property int $total
 */
class Employee extends Model
{
    use BelongsToHotel;

    public const ACTIVO = 'activo';

    public const LICENCIA = 'licencia';

    public const INACTIVO = 'inactivo';

    /**
     * @var list<string>
     */
    public const STATUSES = [self::ACTIVO, self::LICENCIA, self::INACTIVO];

    /**
     * @var list<string>
     */
    public const DEPARTMENTS = [
        'administracion',
        'recepcion',
        'housekeeping',
        'alimentos_bebidas',
        'mantenimiento',
        'seguridad',
        'rrhh',
        'otro',
    ];

    /**
     * Personal data that must never reach an actor without
     * `employees.sensitive`.
     *
     * @var list<string>
     */
    public const SENSITIVE_FIELDS = [
        'cedula',
        'birth_date',
        'phone',
        'email',
        'address',
        'salary',
        'bank_account',
        'emergency_contact_name',
        'emergency_contact_phone',
        'notes',
    ];

    protected $fillable = [
        'hotel_id',
        'user_id',
        'first_name',
        'last_name',
        'cedula',
        'birth_date',
        'phone',
        'email',
        'address',
        'position',
        'department',
        'hire_date',
        'status',
        'salary',
        'bank_account',
        'emergency_contact_name',
        'emergency_contact_phone',
        'notes',
    ];

    /**
     * Sensitive attributes are opt-in when serializing the model.
     *
     * @var list<string>
     */
    protected $hidden = self::SENSITIVE_FIELDS;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
            'hire_date' => 'date',
            'salary' => 'decimal:2',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function fullName(): string
    {
        return trim($this->first_name.' '.$this->last_name);
    }

    /**
     * Reveal the sensitive attributes only for an authorized serialization.
     *
     * @return list<string>
     */
    public static function sensitiveFields(): array
    {
        return self::SENSITIVE_FIELDS;
    }
}
