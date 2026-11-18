import { useForm } from '@inertiajs/react';
import { Loader2, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { revoke as revokeAccess } from '@/routes/employees/access';
import type { Employee } from '@/types';

/**
 * Remove the hotel access of the user linked to an employee. The employee
 * record and its history stay untouched; only the membership is revoked.
 */
export function EmployeeRevokeDialog({
    employee,
    onClose,
}: {
    employee: Employee;
    onClose: () => void;
}) {
    const { delete: destroy, processing, errors } = useForm({});

    const recordErrors = errors as unknown as Record<
        string,
        string | undefined
    >;

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        destroy(revokeAccess.url({ employee: employee.id }), {
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
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldOff className="size-4 text-destructive" />
                        Revocar acceso
                    </DialogTitle>
                    <DialogDescription>
                        Se quitará la membresía de{' '}
                        <strong>{employee.user?.name ?? 'este usuario'}</strong>{' '}
                        en el hotel. El expediente de {employee.first_name}{' '}
                        {employee.last_name} se conserva.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-muted-foreground">
                        El usuario perderá el acceso al hotel de inmediato. Si
                        es el último propietario, la operación se rechaza para
                        no dejar el hotel sin administración.
                    </div>

                    {recordErrors.access && (
                        <p className="text-sm text-destructive">
                            {recordErrors.access}
                        </p>
                    )}
                    {recordErrors.role && (
                        <p className="text-sm text-destructive">
                            {recordErrors.role}
                        </p>
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
                            variant="destructive"
                            disabled={processing}
                        >
                            {processing && (
                                <Loader2 className="size-4 animate-spin" />
                            )}
                            Revocar acceso
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
