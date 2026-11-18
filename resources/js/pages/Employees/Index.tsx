import { Head, router } from '@inertiajs/react';
import {
    ArrowRight,
    Building2,
    CakeSlice,
    CalendarClock,
    KeyRound,
    Lock,
    Pencil,
    Plus,
    ShieldCheck,
    ShieldOff,
    UserPlus,
    Users,
    UserX,
    Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { DataTable } from '@/components/data-table';
import type { DataTableColumn } from '@/components/data-table';
import { EmployeeAccessDialog } from '@/components/employees/employee-access-dialog';
import { EmployeeDialog } from '@/components/employees/employee-dialog';
import { EmployeeRevokeDialog } from '@/components/employees/employee-revoke-dialog';
import { EmptyState } from '@/components/empty-state';
import { ListFilters } from '@/components/list-filters';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { RowActions } from '@/components/row-actions';
import type { RowAction } from '@/components/row-actions';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    employeeDepartmentLabels,
    employeeLabel,
    employeeRoleLabels,
    employeeStatusLabels,
} from '@/lib/employee-labels';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { index as employeesIndex } from '@/routes/employees';
import type { Employee, EmployeeTab, EmployeesIndexProps } from '@/types';

const statusStyles: Record<string, string> = {
    activo: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    licencia:
        'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    inactivo: 'bg-muted text-muted-foreground',
};

function EmployeeStatusBadge({ status }: { status: string }) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                statusStyles[status] ?? 'bg-muted text-muted-foreground',
            )}
        >
            {employeeLabel(employeeStatusLabels, status)}
        </span>
    );
}

function initials(firstName: string, lastName: string): string {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export default function Index({
    currency,
    kpis,
    employees,
    recentHires,
    departmentSummary,
    upcomingBirthdays,
    availableUsers,
    filters,
    options,
    permissions,
}: EmployeesIndexProps) {
    const tab = filters.tab;
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(
        null,
    );
    const [accessTarget, setAccessTarget] = useState<Employee | null>(null);
    const [revokeTarget, setRevokeTarget] = useState<Employee | null>(null);

    const visit = (params: Record<string, string>) => {
        const query: Record<string, string> = {
            ...filters,
            ...params,
        };

        Object.keys(query).forEach((key) => {
            if (query[key] === '') {
                delete query[key];
            }
        });

        router.get(employeesIndex.url(), query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const changeTab = (next: EmployeeTab) => visit({ tab: next });

    const openCreate = () => {
        setEditingEmployee(null);
        setDialogOpen(true);
    };

    const openEdit = (employee: Employee) => {
        setEditingEmployee(employee);
        setDialogOpen(true);
    };

    const roleLabelFor = (employee: Employee): string | null => {
        const user = availableUsers.find(
            (candidate) => candidate.id === employee.user_id,
        );

        if (!user) {
            return null;
        }

        return (
            employeeRoleLabels[user.role ?? ''] ?? user.roleLabel ?? 'Sin rol'
        );
    };

    const rowActions = (employee: Employee): RowAction[] => {
        const actions: RowAction[] = [];

        if (permissions.manage) {
            actions.push({
                label: 'Editar expediente',
                icon: Pencil,
                onSelect: () => openEdit(employee),
            });
        }

        if (permissions.access) {
            actions.push({
                label: employee.user ? 'Actualizar acceso' : 'Vincular acceso',
                icon: KeyRound,
                onSelect: () => setAccessTarget(employee),
            });

            if (employee.user) {
                actions.push({
                    label: 'Revocar acceso',
                    icon: ShieldOff,
                    destructive: true,
                    onSelect: () => setRevokeTarget(employee),
                });
            }
        }

        return actions;
    };

    const columns: DataTableColumn<Employee>[] = [
        {
            id: 'employee',
            header: 'Empleado',
            cell: (employee) => (
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {initials(employee.first_name, employee.last_name)}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                            {employee.first_name} {employee.last_name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                            {employee.position}
                        </p>
                    </div>
                </div>
            ),
        },
        {
            id: 'department',
            header: 'Departamento',
            cell: (employee) =>
                employeeLabel(employeeDepartmentLabels, employee.department),
        },
        {
            id: 'hire_date',
            header: 'Ingreso',
            cell: (employee) => (
                <div className="space-y-1">
                    <p>{formatDate(employee.hire_date)}</p>
                    <EmployeeStatusBadge status={employee.status} />
                </div>
            ),
        },
        {
            id: 'contact',
            header: 'Contacto',
            cell: (employee) => {
                if (!permissions.sensitive) {
                    return (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Lock className="size-3" />
                            Protegido
                        </span>
                    );
                }

                if (!employee.email && !employee.phone) {
                    return '—';
                }

                return (
                    <div className="min-w-0 text-sm">
                        {employee.email && (
                            <p className="truncate text-foreground">
                                {employee.email}
                            </p>
                        )}
                        {employee.phone && (
                            <p className="truncate text-xs text-muted-foreground">
                                {employee.phone}
                            </p>
                        )}
                    </div>
                );
            },
        },
        {
            id: 'salary',
            header: 'Nómina',
            align: 'right',
            cell: (employee) =>
                permissions.sensitive ? (
                    <span className="font-medium text-foreground">
                        {employee.salary !== null &&
                        employee.salary !== undefined
                            ? formatCurrency(employee.salary, currency)
                            : '—'}
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Lock className="size-3" />
                        Protegido
                    </span>
                ),
        },
        {
            id: 'access',
            header: 'Acceso',
            cell: (employee) =>
                employee.user ? (
                    <div className="min-w-0">
                        <p className="truncate text-sm text-foreground">
                            {employee.user.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                            {permissions.access
                                ? (roleLabelFor(employee) ?? 'Con acceso')
                                : 'Con acceso'}
                        </p>
                    </div>
                ) : (
                    <span className="text-xs text-muted-foreground">
                        Sin acceso
                    </span>
                ),
        },
        {
            id: 'actions',
            header: '',
            align: 'right',
            cell: (employee) => <RowActions actions={rowActions(employee)} />,
        },
    ];

    const tabs: { id: EmployeeTab; label: string; count?: number }[] = [
        { id: 'resumen', label: 'Resumen' },
        { id: 'directorio', label: 'Directorio', count: employees.total },
    ];

    const maxDepartment = Math.max(
        1,
        ...departmentSummary.map((row) => row.total),
    );

    return (
        <>
            <Head title="Empleados" />

            <div className="space-y-5">
                <PageHeader
                    title="Empleados"
                    description="Expedientes del equipo, datos sensibles protegidos y accesos al hotel."
                    actions={
                        permissions.manage ? (
                            <Button type="button" onClick={openCreate}>
                                <Plus className="size-4" />
                                Nuevo empleado
                            </Button>
                        ) : undefined
                    }
                />

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                    <StatCard
                        label="Activos"
                        value={formatNumber(kpis.active)}
                        hint="En plantilla"
                        icon={Users}
                        tone="success"
                    />
                    <StatCard
                        label="En licencia"
                        value={formatNumber(kpis.onLeave)}
                        hint="Fuera temporalmente"
                        icon={CalendarClock}
                        tone="warning"
                    />
                    <StatCard
                        label="Inactivos"
                        value={formatNumber(kpis.inactive)}
                        hint="Expediente conservado"
                        icon={UserX}
                        tone="primary"
                    />
                    <StatCard
                        label="Ingresos del mes"
                        value={formatNumber(kpis.hiresThisMonth)}
                        hint="Nuevas incorporaciones"
                        icon={UserPlus}
                        tone="primary"
                    />
                    <StatCard
                        label="Accesos vinculados"
                        value={formatNumber(kpis.accessLinked)}
                        hint="Usuarios con rol"
                        icon={KeyRound}
                        tone="primary"
                    />
                    <StatCard
                        label="Nómina mensual"
                        value={
                            kpis.payroll === null
                                ? 'Protegida'
                                : formatCurrency(kpis.payroll, currency)
                        }
                        hint={
                            kpis.payroll === null
                                ? 'Requiere datos sensibles'
                                : 'Personal activo y en licencia'
                        }
                        icon={kpis.payroll === null ? Lock : Wallet}
                        tone="success"
                    />
                </div>

                <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1.5">
                    {tabs.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => changeTab(item.id)}
                            className={cn(
                                'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                tab === item.id
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                            )}
                        >
                            {item.label}
                            {typeof item.count === 'number' && (
                                <span
                                    className={cn(
                                        'rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
                                        tab === item.id
                                            ? 'bg-white/20 text-primary-foreground'
                                            : 'bg-muted text-muted-foreground',
                                    )}
                                >
                                    {item.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {tab === 'resumen' && (
                    <div className="grid gap-4 lg:grid-cols-2">
                        <Card className="shadow-xs">
                            <CardContent className="space-y-4 p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                            <UserPlus className="size-4 text-primary" />
                                            Nuevos ingresos
                                        </h2>
                                        <p className="text-xs text-muted-foreground">
                                            Últimas incorporaciones al equipo.
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => changeTab('directorio')}
                                    >
                                        Ver directorio
                                        <ArrowRight className="size-4" />
                                    </Button>
                                </div>

                                {recentHires.length === 0 ? (
                                    <EmptyState
                                        icon={UserPlus}
                                        title="Sin ingresos registrados"
                                        description="Registra al primer empleado para ver aquí las incorporaciones recientes."
                                        action={
                                            permissions.manage ? (
                                                <Button
                                                    type="button"
                                                    onClick={openCreate}
                                                >
                                                    <Plus className="size-4" />
                                                    Nuevo empleado
                                                </Button>
                                            ) : undefined
                                        }
                                    />
                                ) : (
                                    <ul className="divide-y divide-border">
                                        {recentHires.map((employee) => (
                                            <li
                                                key={employee.id}
                                                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                                            >
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                                                        {initials(
                                                            employee.first_name,
                                                            employee.last_name,
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium text-foreground">
                                                            {
                                                                employee.first_name
                                                            }{' '}
                                                            {employee.last_name}
                                                        </p>
                                                        <p className="truncate text-xs text-muted-foreground">
                                                            {employee.position}{' '}
                                                            ·{' '}
                                                            {employeeLabel(
                                                                employeeDepartmentLabels,
                                                                employee.department,
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="shrink-0 space-y-1 text-right">
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatDate(
                                                            employee.hire_date,
                                                        )}
                                                    </p>
                                                    <EmployeeStatusBadge
                                                        status={employee.status}
                                                    />
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="shadow-xs">
                            <CardContent className="space-y-4 p-5">
                                <div>
                                    <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                        <Building2 className="size-4 text-primary" />
                                        Equipo por departamento
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        Distribución de los expedientes
                                        registrados.
                                    </p>
                                </div>

                                {departmentSummary.length === 0 ? (
                                    <EmptyState
                                        icon={Building2}
                                        title="Sin departamentos con personal"
                                        description="Cuando registres empleados verás aquí la distribución del equipo."
                                    />
                                ) : (
                                    <ul className="space-y-3">
                                        {departmentSummary.map((row) => (
                                            <li
                                                key={row.department}
                                                className="space-y-1.5"
                                            >
                                                <div className="flex items-center justify-between gap-3 text-sm">
                                                    <span className="truncate font-medium text-foreground">
                                                        {employeeLabel(
                                                            employeeDepartmentLabels,
                                                            row.department,
                                                        )}
                                                    </span>
                                                    <span className="shrink-0 font-semibold text-foreground">
                                                        {formatNumber(
                                                            row.total,
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                                    <div
                                                        className="h-full rounded-full bg-primary"
                                                        style={{
                                                            width: `${Math.max(
                                                                4,
                                                                (row.total /
                                                                    maxDepartment) *
                                                                    100,
                                                            )}%`,
                                                        }}
                                                    />
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="shadow-xs lg:col-span-2">
                            <CardContent className="space-y-4 p-5">
                                {permissions.sensitive ? (
                                    <>
                                        <div>
                                            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                                <CakeSlice className="size-4 text-primary" />
                                                Cumpleaños del mes
                                            </h2>
                                            <p className="text-xs text-muted-foreground">
                                                Información visible solo con el
                                                permiso de datos sensibles.
                                            </p>
                                        </div>

                                        {upcomingBirthdays.length === 0 ? (
                                            <EmptyState
                                                icon={CakeSlice}
                                                title="Sin cumpleaños este mes"
                                                description="Los cumpleaños registrados en los expedientes aparecerán aquí."
                                            />
                                        ) : (
                                            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                                {upcomingBirthdays.map(
                                                    (birthday) => (
                                                        <li
                                                            key={birthday.id}
                                                            className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5"
                                                        >
                                                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                                                                {birthday.day}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-medium text-foreground">
                                                                    {
                                                                        birthday.name
                                                                    }
                                                                </p>
                                                                <p className="truncate text-xs text-muted-foreground">
                                                                    {employeeLabel(
                                                                        employeeDepartmentLabels,
                                                                        birthday.department,
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </li>
                                                    ),
                                                )}
                                            </ul>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex items-start gap-4">
                                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                            <ShieldCheck className="size-5" />
                                        </div>
                                        <div className="space-y-1">
                                            <h2 className="text-sm font-semibold text-foreground">
                                                Datos sensibles protegidos
                                            </h2>
                                            <p className="max-w-2xl text-sm text-muted-foreground">
                                                Tu rol puede consultar el
                                                directorio, pero no cédulas,
                                                contactos, salarios ni notas
                                                internas. Un propietario o
                                                Recursos Humanos puede otorgar
                                                el permiso de datos sensibles.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {tab === 'directorio' && (
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3">
                            <div className="space-y-1">
                                <Label
                                    htmlFor="employees-hired-from"
                                    className="text-xs text-muted-foreground"
                                >
                                    Ingreso desde
                                </Label>
                                <Input
                                    id="employees-hired-from"
                                    type="date"
                                    value={filters.hired_from}
                                    onChange={(event) =>
                                        visit({
                                            hired_from: event.target.value,
                                            tab: 'directorio',
                                        })
                                    }
                                    className="w-auto"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label
                                    htmlFor="employees-hired-to"
                                    className="text-xs text-muted-foreground"
                                >
                                    Hasta
                                </Label>
                                <Input
                                    id="employees-hired-to"
                                    type="date"
                                    value={filters.hired_to}
                                    onChange={(event) =>
                                        visit({
                                            hired_to: event.target.value,
                                            tab: 'directorio',
                                        })
                                    }
                                    className="w-auto"
                                />
                            </div>
                            {(filters.hired_from !== '' ||
                                filters.hired_to !== '') && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                        visit({
                                            hired_from: '',
                                            hired_to: '',
                                            tab: 'directorio',
                                        })
                                    }
                                >
                                    Limpiar fechas
                                </Button>
                            )}
                        </div>

                        <ListFilters
                            url={employeesIndex.url()}
                            search={filters.search}
                            searchPlaceholder="Buscar por nombre, cargo, cédula o correo…"
                            extraParams={{
                                tab,
                                hired_from: filters.hired_from,
                                hired_to: filters.hired_to,
                            }}
                            selects={[
                                {
                                    key: 'department',
                                    label: 'Departamento',
                                    value: filters.department,
                                    options: options.departments.map(
                                        (value) => ({
                                            value,
                                            label:
                                                employeeDepartmentLabels[
                                                    value
                                                ] ?? value,
                                        }),
                                    ),
                                },
                                {
                                    key: 'status',
                                    label: 'Estado',
                                    value: filters.status,
                                    options: options.statuses.map((value) => ({
                                        value,
                                        label:
                                            employeeStatusLabels[value] ??
                                            value,
                                    })),
                                },
                                {
                                    key: 'access',
                                    label: 'Acceso',
                                    value: filters.access,
                                    options: [
                                        { value: 'con', label: 'Con acceso' },
                                        { value: 'sin', label: 'Sin acceso' },
                                    ],
                                },
                            ]}
                        />

                        <DataTable
                            caption="Directorio de empleados"
                            columns={columns}
                            rows={employees.data}
                            rowKey={(employee) => employee.id}
                            empty={
                                <EmptyState
                                    icon={Users}
                                    title="Sin empleados en el directorio"
                                    description="Ajusta los filtros o registra el primer expediente del equipo."
                                    action={
                                        permissions.manage ? (
                                            <Button
                                                type="button"
                                                onClick={openCreate}
                                            >
                                                <Plus className="size-4" />
                                                Nuevo empleado
                                            </Button>
                                        ) : undefined
                                    }
                                />
                            }
                        />

                        <Pagination meta={employees} />
                    </div>
                )}
            </div>

            {dialogOpen && (
                <EmployeeDialog
                    employee={editingEmployee}
                    departments={options.departments}
                    statuses={options.statuses}
                    canSensitive={permissions.sensitive}
                    onClose={() => {
                        setDialogOpen(false);
                        setEditingEmployee(null);
                    }}
                />
            )}

            {accessTarget && (
                <EmployeeAccessDialog
                    employee={accessTarget}
                    users={availableUsers}
                    roles={options.roles}
                    onClose={() => setAccessTarget(null)}
                />
            )}

            {revokeTarget && (
                <EmployeeRevokeDialog
                    employee={revokeTarget}
                    onClose={() => setRevokeTarget(null)}
                />
            )}
        </>
    );
}
