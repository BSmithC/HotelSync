import { useForm } from '@inertiajs/react';
import { Ban, Loader2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';

/**
 * Cancel a service request with a mandatory reason. The record is kept for
 * traceability; billed requests must void their invoice first.
 */
export function ServiceVoidDialog({
    endpoint,
    onClose,
}: {
    endpoint: string;
    onClose: () => void;
}) {
    const { data, setData, post, processing, errors } = useForm({
        reason: '',
    });

    const recordErrors = errors as unknown as Record<
        string,
        string | undefined
    >;

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        post(endpoint, {
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
                        <Ban className="size-4 text-destructive" />
                        Anular solicitud
                    </DialogTitle>
                    <DialogDescription>
                        La solicitud quedará anulada con su motivo. Si ya fue
                        facturada, primero anula la factura en Finanzas.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="service-void-reason">
                            Motivo de la anulación
                        </Label>
                        <Textarea
                            id="service-void-reason"
                            value={data.reason}
                            onChange={(event) =>
                                setData('reason', event.target.value)
                            }
                            rows={3}
                            placeholder="Ej. El huésped canceló el servicio"
                            autoFocus
                        />
                        {errors.reason && (
                            <p className="text-sm text-destructive">
                                {errors.reason}
                            </p>
                        )}
                        {recordErrors.request && (
                            <p className="text-sm text-destructive">
                                {recordErrors.request}
                            </p>
                        )}
                    </div>

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
                            disabled={processing || data.reason.trim() === ''}
                        >
                            {processing && (
                                <Loader2 className="size-4 animate-spin" />
                            )}
                            Anular solicitud
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
