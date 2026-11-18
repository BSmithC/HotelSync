<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\User;
use App\Services\EmployeeService;
use App\Support\CurrentHotel;
use App\Support\Permission;
use App\Support\Role;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class EmployeesController extends Controller
{
    /**
     * @var list<string>
     */
    private const ACCESS_STATES = ['con', 'sin'];

    /**
     * Employee directory: team indicators, privacy-aware data and access
     * links, scoped to the current hotel.
     */
    public function index(Request $request): Response
    {
        $this->authorize(Permission::EmployeesView->value);

        $user = $request->user();
        $canSensitive = $user->can(Permission::EmployeesSensitive->value);
        $canAccess = $user->can(Permission::EmployeesAccess->value);

        $hotel = app(CurrentHotel::class)->model();
        $timezone = $hotel?->timezone ?? config('app.timezone');
        $currency = $hotel?->currency ?? 'DOP';
        $now = CarbonImmutable::now($timezone);

        $tab = (string) $request->input('tab', 'resumen');
        $tab = in_array($tab, ['resumen', 'directorio'], true) ? $tab : 'resumen';

        $search = trim((string) $request->input('search', ''));
        $department = $this->filterValue($request, 'department', Employee::DEPARTMENTS);
        $status = $this->filterValue($request, 'status', Employee::STATUSES);
        $access = $this->filterValue($request, 'access', self::ACCESS_STATES);
        $hiredFrom = $this->parseDate($request->input('hired_from'), $timezone);
        $hiredTo = $this->parseDate($request->input('hired_to'), $timezone);

        $employees = $this->employeesQuery(
            $search,
            $department,
            $status,
            $access,
            $hiredFrom,
            $hiredTo,
            $canSensitive,
        )
            ->with('user:id,name,email')
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->paginate(10, ['*'], 'employees_page')
            ->withQueryString()
            ->through(function (Employee $employee) use ($canSensitive): Employee {
                if ($canSensitive) {
                    $employee->makeVisible(Employee::SENSITIVE_FIELDS);
                }

                return $employee;
            });

        $base = Employee::query();

        $monthStart = $now->startOfMonth()->toDateString();
        $monthEnd = $now->endOfMonth()->toDateString();

        $payroll = $canSensitive
            ? round((float) (clone $base)
                ->where('status', '!=', Employee::INACTIVO)
                ->sum('salary'), 2)
            : null;

        return Inertia::render('Employees/Index', [
            'currency' => $currency,
            'timezone' => $timezone,
            'kpis' => [
                'active' => (clone $base)->where('status', Employee::ACTIVO)->count(),
                'onLeave' => (clone $base)->where('status', Employee::LICENCIA)->count(),
                'inactive' => (clone $base)->where('status', Employee::INACTIVO)->count(),
                'departments' => (clone $base)->distinct()->count('department'),
                'accessLinked' => (clone $base)->whereNotNull('user_id')->count(),
                'hiresThisMonth' => (clone $base)
                    ->whereDate('hire_date', '>=', $monthStart)
                    ->whereDate('hire_date', '<=', $monthEnd)
                    ->count(),
                'payroll' => $payroll,
            ],
            'employees' => $employees,
            'recentHires' => Employee::query()
                ->with('user:id,name')
                ->latest('hire_date')
                ->latest('id')
                ->limit(6)
                ->get([
                    'id',
                    'user_id',
                    'first_name',
                    'last_name',
                    'position',
                    'department',
                    'hire_date',
                    'status',
                ]),
            'departmentSummary' => Employee::query()
                ->select('department')
                ->selectRaw('COUNT(*) as total')
                ->groupBy('department')
                ->orderByDesc('total')
                ->get()
                ->map(fn (Employee $row): array => [
                    'department' => (string) $row->department,
                    'total' => (int) $row->total,
                ])
                ->values()
                ->all(),
            'upcomingBirthdays' => $canSensitive
                ? Employee::query()
                    ->whereNotNull('birth_date')
                    ->get(['id', 'first_name', 'last_name', 'department', 'birth_date'])
                    ->filter(fn (Employee $employee): bool => $employee->birth_date?->month === $now->month)
                    ->sortBy(fn (Employee $employee): int => (int) $employee->birth_date?->day)
                    ->take(6)
                    ->map(fn (Employee $employee): array => [
                        'id' => $employee->id,
                        'name' => $employee->fullName(),
                        'department' => $employee->department,
                        'day' => (int) $employee->birth_date?->day,
                    ])
                    ->values()
                    ->all()
                : [],
            'availableUsers' => $canAccess
                ? $this->availableUsers()
                : [],
            'filters' => [
                'search' => $search,
                'department' => $department,
                'status' => $status,
                'access' => $access,
                'hired_from' => $hiredFrom?->toDateString() ?? '',
                'hired_to' => $hiredTo?->toDateString() ?? '',
                'tab' => $tab,
            ],
            'options' => [
                'departments' => Employee::DEPARTMENTS,
                'statuses' => Employee::STATUSES,
                'roles' => array_map(
                    fn (Role $role): array => [
                        'value' => $role->value,
                        'label' => $role->label(),
                    ],
                    Role::cases(),
                ),
            ],
            'permissions' => [
                'manage' => $user->can(Permission::EmployeesManage->value),
                'sensitive' => $canSensitive,
                'access' => $canAccess,
            ],
        ]);
    }

    public function store(Request $request, EmployeeService $service): RedirectResponse
    {
        $this->authorize(Permission::EmployeesManage->value);

        $canSensitive = $request->user()->can(Permission::EmployeesSensitive->value);

        $validated = $request->validate(
            $this->rules(null, $canSensitive),
            $this->messages(),
        );

        $service->create($validated, $request->user(), $canSensitive);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Empleado registrado correctamente.',
        ]);

        return back();
    }

    public function update(
        Request $request,
        Employee $employee,
        EmployeeService $service,
    ): RedirectResponse {
        $this->authorize(Permission::EmployeesManage->value);

        $canSensitive = $request->user()->can(Permission::EmployeesSensitive->value);

        $validated = $request->validate(
            $this->rules($employee, $canSensitive),
            $this->messages(),
        );

        $service->update($employee, $validated, $request->user(), $canSensitive);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Empleado actualizado correctamente.',
        ]);

        return back();
    }

    public function linkAccess(
        Request $request,
        Employee $employee,
        EmployeeService $service,
    ): RedirectResponse {
        $this->authorize(Permission::EmployeesAccess->value);

        $validated = $request->validate([
            'user_id' => ['required', Rule::exists('users', 'id')],
            'role' => ['required', Rule::in(array_map(
                fn (Role $role): string => $role->value,
                Role::cases(),
            ))],
        ], [
            'user_id.required' => 'Selecciona el usuario que tendrá acceso.',
            'role.required' => 'Selecciona el rol del usuario en el hotel.',
        ]);

        $target = User::query()->findOrFail((int) $validated['user_id']);

        $service->linkAccess($employee, $target, (string) $validated['role'], $request->user());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Acceso vinculado correctamente.',
        ]);

        return back();
    }

    public function revokeAccess(
        Request $request,
        Employee $employee,
        EmployeeService $service,
    ): RedirectResponse {
        $this->authorize(Permission::EmployeesAccess->value);

        $service->revokeAccess($employee, $request->user());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Acceso revocado. El empleado conserva su expediente.',
        ]);

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(?Employee $employee = null, bool $canSensitive = false): array
    {
        $hotelId = app(CurrentHotel::class)->id();

        $rules = [
            'first_name' => ['required', 'string', 'max:80'],
            'last_name' => ['required', 'string', 'max:80'],
            'position' => ['required', 'string', 'max:80'],
            'department' => ['required', Rule::in(Employee::DEPARTMENTS)],
            'hire_date' => ['required', 'date'],
            'status' => ['required', Rule::in(Employee::STATUSES)],
        ];

        if (! $canSensitive) {
            return $rules;
        }

        return [
            ...$rules,
            'cedula' => [
                'nullable',
                'string',
                'max:20',
                Rule::unique('employees', 'cedula')
                    ->where(fn ($query) => $query->where('hotel_id', $hotelId))
                    ->ignore($employee?->id),
            ],
            'birth_date' => ['nullable', 'date', 'after:1900-01-01', 'before:today'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:120'],
            'address' => ['nullable', 'string', 'max:200'],
            'salary' => ['nullable', 'numeric', 'min:0', 'max:99999999'],
            'bank_account' => ['nullable', 'string', 'max:60'],
            'emergency_contact_name' => ['nullable', 'string', 'max:120'],
            'emergency_contact_phone' => ['nullable', 'string', 'max:30'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    private function messages(): array
    {
        return [
            'first_name.required' => 'Indica el nombre del empleado.',
            'last_name.required' => 'Indica el apellido del empleado.',
            'position.required' => 'Indica el cargo del empleado.',
            'hire_date.required' => 'Indica la fecha de ingreso.',
            'cedula.unique' => 'Ya existe un empleado con esa cédula en este hotel.',
            'birth_date.before' => 'La fecha de nacimiento debe ser anterior a hoy.',
        ];
    }

    /**
     * @return Builder<Employee>
     */
    private function employeesQuery(
        string $search,
        string $department,
        string $status,
        string $access,
        ?CarbonImmutable $hiredFrom,
        ?CarbonImmutable $hiredTo,
        bool $canSensitive,
    ): Builder {
        return Employee::query()
            ->when(
                $department !== '',
                fn (Builder $query) => $query->where('department', $department),
            )
            ->when(
                $status !== '',
                fn (Builder $query) => $query->where('status', $status),
            )
            ->when(
                $access !== '',
                fn (Builder $query) => $access === 'con'
                    ? $query->whereNotNull('user_id')
                    : $query->whereNull('user_id'),
            )
            ->when(
                $hiredFrom !== null,
                fn (Builder $query) => $query->whereDate('hire_date', '>=', $hiredFrom->toDateString()),
            )
            ->when(
                $hiredTo !== null,
                fn (Builder $query) => $query->whereDate('hire_date', '<=', $hiredTo->toDateString()),
            )
            ->when($search !== '', function (Builder $query) use ($search, $canSensitive): void {
                $query->where(function (Builder $query) use ($search, $canSensitive): void {
                    $query->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('position', 'like', "%{$search}%")
                        ->orWhere('department', 'like', "%{$search}%");

                    if ($canSensitive) {
                        $query->orWhere('cedula', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%");
                    }
                });
            });
    }

    /**
     * Users that hold a membership in the current hotel (or are already
     * linked to one of its employees) are the only candidates for access.
     *
     * @return list<array<string, mixed>>
     */
    private function availableUsers(): array
    {
        $hotelId = app(CurrentHotel::class)->id();

        if ($hotelId === null) {
            return [];
        }

        $employeeByUser = Employee::query()
            ->whereNotNull('user_id')
            ->get(['id', 'user_id'])
            ->mapWithKeys(fn (Employee $employee): array => [
                (int) $employee->user_id => (int) $employee->id,
            ])
            ->all();

        return User::query()
            ->where(function (Builder $query) use ($hotelId, $employeeByUser): void {
                $query->whereHas('hotels', fn (Builder $hotel) => $hotel->where('hotels.id', $hotelId));

                if ($employeeByUser !== []) {
                    $query->orWhereIn('users.id', array_keys($employeeByUser));
                }
            })
            ->with(['hotels' => fn ($hotel) => $hotel->where('hotels.id', $hotelId)])
            ->orderBy('name')
            ->limit(300)
            ->get(['users.id', 'users.name', 'users.email'])
            ->map(function (User $user) use ($employeeByUser): array {
                $role = $user->hotels->first()?->pivot?->role;

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $role,
                    'roleLabel' => $role === null
                        ? null
                        : Role::tryFrom((string) $role)?->label(),
                    'linked_employee_id' => $employeeByUser[(int) $user->id] ?? null,
                ];
            })
            ->values()
            ->all();
    }

    private function parseDate(mixed $value, string $timezone): ?CarbonImmutable
    {
        if (! is_string($value) || ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return null;
        }

        $date = CarbonImmutable::createFromFormat('!Y-m-d', $value, $timezone);

        return $date === false ? null : $date->startOfDay();
    }

    /**
     * @param  list<string>  $allowed
     */
    private function filterValue(Request $request, string $key, array $allowed): string
    {
        $value = (string) $request->input($key, '');

        return in_array($value, $allowed, true) ? $value : '';
    }
}
