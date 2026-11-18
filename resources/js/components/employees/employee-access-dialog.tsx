import { useForm } from '@inertiajs/react';
import { KeyRound, ShieldCheck, UserCheck } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { employeeRoleLabels } from '@/lib/employee-labels';
import { access } from '@/routes/employees';
import type { Employee, EmployeeAccessUser, EmployeeRoleOption } from '@/types';

/**
 * Link an employee to an existing user account and assign their role in the
 * hotel. The user must already belong to the hotel: this dialog never creates
 * accounts or exposes users from other hotels.
 */
export function EmployeeAccessDialog({
    employee,
    users,
    roles,
    onClose,
}: {
    employee: Employee;
    users: EmployeeAccessUser[];
    roles: EmployeeRoleOption[];
    onClose: () => void;
}) {
    const eligible = users.filter(
        (user) =>
            user.linked_employee_id === null ||
            user.linked_employee_id === employee.id,
    );

    const current =
        eligible.find((user) => user.id === employee.user_id) ?? null;
    const first = eligible[0] ?? null;

    const { data, setData, post, processing, errors } = useForm({
        user_id: current ? String(current.id) : first ? String(first.id) : '',
        role: current?.role ?? first?.role ?? 'recepcion',
    });

    const handleUser = (value: string) => {
        const selected = eligible.find((user) => String(user.id) === value);

        setData('user_id', value);
        setData('role', selected?.role ?? data.role);
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (data.user_id === '') {
            return;
        }

        post(access.url({ employee: employee.id }), {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
        >
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <KeyRound className="size-4 text-primary" />
                        {employee.user
                            ? 'Actualizar acceso'
                            : 'Vincular acceso'}
                    </DialogTitle>
                    <DialogDescription>
                        Asigna a {employee.first_name} {employee.last_name} una
                        cuenta existente y su rol dentro del hotel.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm">
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">
                                Empleado
                            </span>
                            <strong className="text-right">
                                {employee.first_name} {employee.last_name}
                            </strong>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Cargo</span>
                            <span className="text-right">
                                {employee.position}
                            </span>
                        </div>
                        {employee.user && (
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-muted-foreground">
                                    Acceso actual
                                </span>
                                <span className="text-right">
                                    {employee.user.name} ·{' '}
                                    {employeeRoleLabels[current?.role ?? ''] ??
                                        current?.roleLabel ??
                                        'Sin rol'}
                                </span>
                            </div>
                        )}
                    </div>

                    {eligible.length === 0 ? (
                        <EmptyState
                            icon={UserCheck}
                            title="No hay usuarios disponibles"
                            description="Todos los usuarios del hotel ya están vinculados a otro empleado. Crea una cuenta desde la administración de usuarios del sistema."
                        />
                    ) : (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="access-user">Usuario</Label>
                                <Select
                                    value={data.user_id}
                                    onValueChange={handleUser}
                                >
                                    <SelectTrigger id="access-user">
                                        <SelectValue placeholder="Selecciona un usuario" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {eligible.map((user) => (
                                            <SelectItem
                                                key={user.id}
                                                value={String(user.id)}
                                            >
                                                {user.name} · {user.email}
                                                {user.roleLabel
                                                    ? ` · ${user.roleLabel}`
                                                    : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.user_id && (
                                    <p className="text-sm text-destructive">
                                        {errors.user_id}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="access-role">
                                    Rol en el hotel
                                </Label>
                                <Select
                                    value={data.role}
                                    onValueChange={(value) =>
                                        setData('role', value)
                                    }
                                >
                                    <SelectTrigger id="access-role">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles.map((role) => (
                                            <SelectItem
                                                key={role.value}
                                                value={role.value}
                                            >
                                                {role.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.role && (
                                    <p className="text-sm text-destructive">
                                        {errors.role}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                                <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
                                <p>
                                    Solo se listan usuarios con acceso a este
                                    hotel. El empleado conserva su expediente si
                                    el acceso se revoca.
                                </p>
                            </div>
                        </>
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
                        <Button
                            type="submit"
                            disabled={
                                processing ||
                                eligible.length === 0 ||
                                data.user_id === ''
                            }
                        >
                            {processing ? 'Guardando…' : 'Guardar acceso'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
