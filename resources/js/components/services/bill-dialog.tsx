import { useForm } from '@inertiajs/react';
import { ReceiptText } from 'lucide-react';
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
import { formatCurrency } from '@/lib/format';
import { bill as billRequest } from '@/routes/services/requests';
import type { ServiceBillOption, ServiceRequest } from '@/types';

/**
 * Convert a completed request into an invoice line.
 *
 * The default is a new invoice for the guest. Appending to an existing open
 * invoice is allowed only when it belongs to the same client and has no
 * registered collections.
 */
export function BillDialog({
    request,
    openBills,
    currency,
    onClose,
}: {
    request: ServiceRequest;
    openBills: ServiceBillOption[];
    currency: string;
    onClose: () => void;
}) {
    const eligibleBills = openBills.filter(
        (bill) => bill.client_id === request.client_id,
    );

    const { data, setData, post, processing, errors, transform } = useForm({
        bill_id: 'new',
    });

    // The server may report the error on the request relation.
    const recordErrors = errors as unknown as Record<
        string,
        string | undefined
    >;

    transform((current) => ({
        bill_id: current.bill_id === 'new' ? null : current.bill_id,
    }));

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        post(billRequest.url({ serviceRequest: request.id }), {
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
                        <ReceiptText className="size-4 text-primary" />
                        Facturar servicio
                    </DialogTitle>
                    <DialogDescription>
                        Se agregará una línea con el servicio, la cantidad y el
                        precio registrados en la solicitud.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm">
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">
                                Servicio
                            </span>
                            <strong className="text-right">
                                {request.service?.name ?? 'Servicio'}
                            </strong>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">
                                Cantidad × precio
                            </span>
                            <span>
                                {request.quantity} ×{' '}
                                {formatCurrency(request.unit_price, currency)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">
                                Total a facturar
                            </span>
                            <strong>
                                {formatCurrency(request.total, currency)}
                            </strong>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="bill-target">Factura destino</Label>
                        <Select
                            value={data.bill_id}
                            onValueChange={(value) => setData('bill_id', value)}
                        >
                            <SelectTrigger id="bill-target">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="new">
                                    Nueva factura del cliente
                                </SelectItem>
                                {eligibleBills.map((bill) => (
                                    <SelectItem
                                        key={bill.id}
                                        value={String(bill.id)}
                                    >
                                        {bill.number} ·{' '}
                                        {formatCurrency(bill.total, currency)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Solo se muestran facturas pendientes del mismo
                            cliente que aún no tienen cobros.
                        </p>
                        {errors.bill_id && (
                            <p className="text-sm text-destructive">
                                {errors.bill_id}
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
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Facturando…' : 'Facturar servicio'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
