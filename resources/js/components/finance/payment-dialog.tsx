import { useForm } from '@inertiajs/react';
import { Banknote, ReceiptText } from 'lucide-react';
import { useState } from 'react';
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
import { paymentMethodLabels } from '@/lib/finance-labels';
import { formatCurrency, formatDate } from '@/lib/format';
import { createIdempotencyKey } from '@/lib/idempotency';
import { store as storePayment } from '@/routes/finance/payments';
import type { FinancePayableBill } from '@/types';

/**
 * Register a collection against an invoice. The amount defaults to the
 * outstanding balance and the server rejects overpayments.
 */
export function PaymentDialog({
    bills,
    currency,
    defaultDate,
    onClose,
}: {
    bills: FinancePayableBill[];
    currency: string;
    defaultDate: string;
    onClose: () => void;
}) {
    const [key] = useState(() => createIdempotencyKey());

    const { data, setData, post, processing, errors } = useForm({
        bill_id: '',
        method: 'efectivo',
        amount: '',
        paid_at: defaultDate,
        reference: '',
        notes: '',
        idempotency_key: key,
    });

    const selected = bills.find((bill) => String(bill.id) === data.bill_id);

    const handleBill = (value: string) => {
        const bill = bills.find((item) => String(item.id) === value);

        setData((current) => ({
            ...current,
            bill_id: value,
            amount: bill ? String(bill.balance) : '',
        }));
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        post(storePayment.url(), {
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
                        <Banknote className="size-4 text-success" />
                        Registrar cobro
                    </DialogTitle>
                    <DialogDescription>
                        El cobro se aplica a una factura y queda en el libro de
                        movimientos. Los cobros no se eliminan: se anulan con
                        reverso.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="payment-bill">Factura</Label>
                        <Select value={data.bill_id} onValueChange={handleBill}>
                            <SelectTrigger id="payment-bill">
                                <SelectValue placeholder="Selecciona una factura con balance" />
                            </SelectTrigger>
                            <SelectContent>
                                {bills.map((bill) => (
                                    <SelectItem
                                        key={bill.id}
                                        value={String(bill.id)}
                                    >
                                        {bill.number} · {bill.client} ·{' '}
                                        {formatCurrency(bill.balance, currency)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {bills.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                                No hay facturas con balance pendiente.
                            </p>
                        )}
                        {errors.bill_id && (
                            <p className="text-sm text-destructive">
                                {errors.bill_id}
                            </p>
                        )}
                    </div>

                    {selected && (
                        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <ReceiptText className="size-4" />
                                {selected.number} · emitida el{' '}
                                {formatDate(selected.issued_at)}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                <span>
                                    Total:{' '}
                                    <strong>
                                        {formatCurrency(
                                            selected.total,
                                            currency,
                                        )}
                                    </strong>
                                </span>
                                <span>
                                    Cobrado:{' '}
                                    <strong>
                                        {formatCurrency(
                                            selected.paid,
                                            currency,
                                        )}
                                    </strong>
                                </span>
                                <span>
                                    Balance:{' '}
                                    <strong className="text-primary">
                                        {formatCurrency(
                                            selected.balance,
                                            currency,
                                        )}
                                    </strong>
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="payment-amount">Monto</Label>
                            <Input
                                id="payment-amount"
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={data.amount}
                                onChange={(event) =>
                                    setData('amount', event.target.value)
                                }
                                placeholder="0.00"
                            />
                            {errors.amount && (
                                <p className="text-sm text-destructive">
                                    {errors.amount}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="payment-date">
                                Fecha del cobro
                            </Label>
                            <Input
                                id="payment-date"
                                type="date"
                                value={data.paid_at}
                                onChange={(event) =>
                                    setData('paid_at', event.target.value)
                                }
                            />
                            {errors.paid_at && (
                                <p className="text-sm text-destructive">
                                    {errors.paid_at}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="payment-method">Método</Label>
                            <Select
                                value={data.method}
                                onValueChange={(value) =>
                                    setData('method', value)
                                }
                            >
                                <SelectTrigger id="payment-method">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(paymentMethodLabels).map(
                                        ([value, label]) => (
                                            <SelectItem
                                                key={value}
                                                value={value}
                                            >
                                                {label}
                                            </SelectItem>
                                        ),
                                    )}
                                </SelectContent>
                            </Select>
                            {errors.method && (
                                <p className="text-sm text-destructive">
                                    {errors.method}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="payment-reference">
                                Referencia
                            </Label>
                            <Input
                                id="payment-reference"
                                value={data.reference}
                                onChange={(event) =>
                                    setData('reference', event.target.value)
                                }
                                placeholder="Transferencia, voucher…"
                            />
                            {errors.reference && (
                                <p className="text-sm text-destructive">
                                    {errors.reference}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="payment-notes">Notas</Label>
                        <Textarea
                            id="payment-notes"
                            value={data.notes}
                            onChange={(event) =>
                                setData('notes', event.target.value)
                            }
                            rows={2}
                            placeholder="Detalle opcional del cobro"
                        />
                        {errors.notes && (
                            <p className="text-sm text-destructive">
                                {errors.notes}
                            </p>
                        )}
                    </div>

                    {errors.idempotency_key && (
                        <p className="text-sm text-destructive">
                            {errors.idempotency_key}
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
                            disabled={processing || data.bill_id === ''}
                        >
                            {processing ? 'Registrando…' : 'Registrar cobro'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
