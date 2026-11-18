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
 * Asks for the void reason. Nothing is deleted: the service keeps the record
 * and, for payments and expenses, inserts an opposite ledger movement.
 */
export function VoidDialog({
    title,
    description,
    endpoint,
    onClose,
}: {
    title: string;
    description: string;
    endpoint: string;
    onClose: () => void;
}) {
    const { data, setData, post, processing, errors } = useForm({
        reason: '',
    });

    // The server may report the error on the record (payment/expense/bill)
    // instead of the reason field; both must be visible in the dialog.
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
                        {title}
                    </DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="void-reason">
                            Motivo de la anulación
                        </Label>
                        <Textarea
                            id="void-reason"
                            value={data.reason}
                            onChange={(event) =>
                                setData('reason', event.target.value)
                            }
                            rows={3}
                            placeholder="Explica por qué se anula la operación"
                            autoFocus
                        />
                        {errors.reason && (
                            <p className="text-sm text-destructive">
                                {errors.reason}
                            </p>
                        )}
                        {recordErrors.payment && (
                            <p className="text-sm text-destructive">
                                {recordErrors.payment}
                            </p>
                        )}
                        {recordErrors.expense && (
                            <p className="text-sm text-destructive">
                                {recordErrors.expense}
                            </p>
                        )}
                        {recordErrors.bill && (
                            <p className="text-sm text-destructive">
                                {recordErrors.bill}
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
                            Anular
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
