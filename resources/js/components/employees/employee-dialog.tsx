import { useForm } from '@inertiajs/react';
import { BriefcaseBusiness, Lock, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
    employeeDepartmentLabels,
    employeeStatusLabels,
} from '@/lib/employee-labels';
import { toDateInput } from '@/lib/format';
import {
    store as storeEmployee,
    update as updateEmployee,
} from '@/routes/employees';
import type { Employee } from '@/types';

/**
 * Create or edit an employee.
 *
 * Basic fields are always available. Sensitive fields are rendered only for
 * actors with `employees.sensitive`; the server also ignores them when the
 * ability is missing, so the privacy rule never depends on this form.
 */
export function EmployeeDialog({
    employee,
    departments,
    statuses,
    canSensitive,
    onClose,
}: {
    employee?: Employee | null;
    departments: string[];
    statuses: string[];
    canSensitive: boolean;
    onClose: () => void;
}) {
    const editing = Boolean(employee);

    const { data, setData, post, patch, processing, errors, transform } =
        useForm({
            first_name: employee?.first_name ?? '',
            last_name: employee?.last_name ?? '',
            position: employee?.position ?? '',
            department: employee?.department ?? departments[0] ?? 'otro',
            hire_date: toDateInput(employee?.hire_date) || today(),
            status: employee?.status ?? 'activo',
            cedula: employee?.cedula ?? '',
            birth_date: toDateInput(employee?.birth_date),
            phone: employee?.phone ?? '',
            email: employee?.email ?? '',
            address: employee?.address ?? '',
            salary:
                employee?.salary !== undefined && employee?.salary !== null
                    ? String(employee.salary)
                    : '',
            bank_account: employee?.bank_account ?? '',
            emergency_contact_name: employee?.emergency_contact_name ?? '',
            emergency_contact_phone: employee?.emergency_contact_phone ?? '',
            notes: employee?.notes ?? '',
        });

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: onClose,
        };

        if (employee) {
            patch(updateEmployee.url(employee.id), options);
        } else {
            post(storeEmployee.url(), options);
        }
    };

    transform((current) => {
        if (canSensitive) {
            return current;
        }

        return {
            first_name: current.first_name,
            last_name: current.last_name,
            position: current.position,
            department: current.department,
            hire_date: current.hire_date,
            status: current.status,
        };
    });

    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
        >
            <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserRound className="size-4 text-primary" />
                        {editing ? 'Editar empleado' : 'Nuevo empleado'}
                    </DialogTitle>
                    <DialogDescription>
                        El expediente existe sin crear una cuenta de acceso. Los
                        datos personales solo se muestran a Recursos Humanos.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                            <BriefcaseBusiness className="size-3.5" />
                            Datos laborales
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="employee-first-name">
                                    Nombre
                                </Label>
                                <Input
                                    id="employee-first-name"
                                    value={data.first_name}
                                    onChange={(event) =>
                                        setData(
                                            'first_name',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Ej. María"
                                    autoFocus
                                />
                                {errors.first_name && (
                                    <p className="text-sm text-destructive">
                                        {errors.first_name}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="employee-last-name">
                                    Apellido
                                </Label>
                                <Input
                                    id="employee-last-name"
                                    value={data.last_name}
                                    onChange={(event) =>
                                        setData('last_name', event.target.value)
                                    }
                                    placeholder="Ej. Rodríguez"
                                />
                                {errors.last_name && (
                                    <p className="text-sm text-destructive">
                                        {errors.last_name}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="employee-position">Cargo</Label>
                                <Input
                                    id="employee-position"
                                    value={data.position}
                                    onChange={(event) =>
                                        setData('position', event.target.value)
                                    }
                                    placeholder="Ej. Recepcionista"
                                />
                                {errors.position && (
                                    <p className="text-sm text-destructive">
                                        {errors.position}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="employee-department">
                                    Departamento
                                </Label>
                                <Select
                                    value={data.department}
                                    onValueChange={(value) =>
                                        setData('department', value)
                                    }
                                >
                                    <SelectTrigger id="employee-department">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departments.map((value) => (
                                            <SelectItem
                                                key={value}
                                                value={value}
                                            >
                                                {employeeDepartmentLabels[
                                                    value
                                                ] ?? value}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.department && (
                                    <p className="text-sm text-destructive">
                                        {errors.department}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="employee-hire-date">
                                    Fecha de ingreso
                                </Label>
                                <Input
                                    id="employee-hire-date"
                                    type="date"
                                    value={data.hire_date}
                                    onChange={(event) =>
                                        setData('hire_date', event.target.value)
                                    }
                                />
                                {errors.hire_date && (
                                    <p className="text-sm text-destructive">
                                        {errors.hire_date}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="employee-status">Estado</Label>
                                <Select
                                    value={data.status}
                                    onValueChange={(value) =>
                                        setData('status', value)
                                    }
                                >
                                    <SelectTrigger id="employee-status">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statuses.map((value) => (
                                            <SelectItem
                                                key={value}
                                                value={value}
                                            >
                                                {employeeStatusLabels[value] ??
                                                    value}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Los expedientes no se eliminan: usa
                                    «Inactivo» cuando la persona deje el hotel.
                                </p>
                                {errors.status && (
                                    <p className="text-sm text-destructive">
                                        {errors.status}
                                    </p>
                                )}
                            </div>
                        </div>
                    </section>

                    {canSensitive ? (
                        <section className="space-y-4 rounded-xl border border-border bg-muted/25 p-4">
                            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                <Lock className="size-3.5" />
                                Datos personales protegidos
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="employee-cedula">
                                        Cédula
                                    </Label>
                                    <Input
                                        id="employee-cedula"
                                        value={data.cedula}
                                        onChange={(event) =>
                                            setData(
                                                'cedula',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="000-0000000-0"
                                    />
                                    {errors.cedula && (
                                        <p className="text-sm text-destructive">
                                            {errors.cedula}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="employee-birth-date">
                                        Fecha de nacimiento
                                    </Label>
                                    <Input
                                        id="employee-birth-date"
                                        type="date"
                                        value={data.birth_date}
                                        onChange={(event) =>
                                            setData(
                                                'birth_date',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    {errors.birth_date && (
                                        <p className="text-sm text-destructive">
                                            {errors.birth_date}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="employee-phone">
                                        Teléfono
                                    </Label>
                                    <Input
                                        id="employee-phone"
                                        value={data.phone}
                                        onChange={(event) =>
                                            setData('phone', event.target.value)
                                        }
                                        placeholder="809-000-0000"
                                    />
                                    {errors.phone && (
                                        <p className="text-sm text-destructive">
                                            {errors.phone}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="employee-email">
                                        Correo personal
                                    </Label>
                                    <Input
                                        id="employee-email"
                                        type="email"
                                        value={data.email}
                                        onChange={(event) =>
                                            setData('email', event.target.value)
                                        }
                                        placeholder="nombre@correo.com"
                                    />
                                    {errors.email && (
                                        <p className="text-sm text-destructive">
                                            {errors.email}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="employee-address">
                                        Dirección
                                    </Label>
                                    <Input
                                        id="employee-address"
                                        value={data.address}
                                        onChange={(event) =>
                                            setData(
                                                'address',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Calle, sector, ciudad"
                                    />
                                    {errors.address && (
                                        <p className="text-sm text-destructive">
                                            {errors.address}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="employee-salary">
                                        Salario mensual
                                    </Label>
                                    <Input
                                        id="employee-salary"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={data.salary}
                                        onChange={(event) =>
                                            setData(
                                                'salary',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    {errors.salary && (
                                        <p className="text-sm text-destructive">
                                            {errors.salary}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="employee-bank-account">
                                        Cuenta bancaria
                                    </Label>
                                    <Input
                                        id="employee-bank-account"
                                        value={data.bank_account}
                                        onChange={(event) =>
                                            setData(
                                                'bank_account',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    {errors.bank_account && (
                                        <p className="text-sm text-destructive">
                                            {errors.bank_account}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="employee-emergency-name">
                                        Contacto de emergencia
                                    </Label>
                                    <Input
                                        id="employee-emergency-name"
                                        value={data.emergency_contact_name}
                                        onChange={(event) =>
                                            setData(
                                                'emergency_contact_name',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    {errors.emergency_contact_name && (
                                        <p className="text-sm text-destructive">
                                            {errors.emergency_contact_name}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="employee-emergency-phone">
                                        Teléfono de emergencia
                                    </Label>
                                    <Input
                                        id="employee-emergency-phone"
                                        value={data.emergency_contact_phone}
                                        onChange={(event) =>
                                            setData(
                                                'emergency_contact_phone',
                                                event.target.value,
                                            )
                                        }
                                    />
                                    {errors.emergency_contact_phone && (
                                        <p className="text-sm text-destructive">
                                            {errors.emergency_contact_phone}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="employee-notes">
                                        Notas internas
                                    </Label>
                                    <Textarea
                                        id="employee-notes"
                                        value={data.notes}
                                        onChange={(event) =>
                                            setData('notes', event.target.value)
                                        }
                                        rows={3}
                                        placeholder="Información médica, acuerdos o detalles relevantes"
                                    />
                                    {errors.notes && (
                                        <p className="text-sm text-destructive">
                                            {errors.notes}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </section>
                    ) : (
                        <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                            <Lock className="mt-0.5 size-4 shrink-0" />
                            <p>
                                No tienes el permiso de datos sensibles. Los
                                campos personales, salario y notas no se
                                muestran ni se modifican desde este formulario.
                            </p>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={processing}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing
                                ? 'Guardando…'
                                : editing
                                  ? 'Guardar cambios'
                                  : 'Registrar empleado'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function today(): string {
    const now = new Date();
    const pad = (part: number) => String(part).padStart(2, '0');

    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
        now.getDate(),
    )}`;
}
