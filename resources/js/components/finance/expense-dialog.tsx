import { useForm } from '@inertiajs/react';
import { Receipt } from 'lucide-react';
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
import {
    expenseCategoryLabels,
    paymentMethodLabels,
} from '@/lib/finance-labels';
import { createIdempotencyKey } from '@/lib/idempotency';
import { store as storeExpense } from '@/routes/finance/expenses';

/**
 * Register an operating expense. Like collections, expenses are never
 * deleted: a void creates a reversal movement.
 */
export function ExpenseDialog({
    defaultDate,
    onClose,
}: {
    defaultDate: string;
    onClose: () => void;
}) {
    const [key] = useState(() => createIdempotencyKey());

    const { data, setData, post, processing, errors } = useForm({
        category: 'operativo',
        description: '',
        amount: '',
        expense_date: defaultDate,
        method: 'efectivo',
        reference: '',
        supplier: '',
        idempotency_key: key,
    });

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        post(storeExpense.url(), {
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
                        <Receipt className="size-4 text-destructive" />
                        Registrar gasto
                    </DialogTitle>
                    <DialogDescription>
                        El gasto genera un egreso en el libro de movimientos y
                        afecta el flujo de caja del período.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="expense-category">Categoría</Label>
                            <Select
                                value={data.category}
                                onValueChange={(value) =>
                                    setData('category', value)
                                }
                            >
                                <SelectTrigger id="expense-category">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(expenseCategoryLabels).map(
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
                            {errors.category && (
                                <p className="text-sm text-destructive">
                                    {errors.category}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="expense-date">Fecha</Label>
                            <Input
                                id="expense-date"
                                type="date"
                                value={data.expense_date}
                                onChange={(event) =>
                                    setData('expense_date', event.target.value)
                                }
                            />
                            {errors.expense_date && (
                                <p className="text-sm text-destructive">
                                    {errors.expense_date}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="expense-description">Descripción</Label>
                        <Input
                            id="expense-description"
                            value={data.description}
                            onChange={(event) =>
                                setData('description', event.target.value)
                            }
                            placeholder="Ej. Compra de artículos de limpieza"
                        />
                        {errors.description && (
                            <p className="text-sm text-destructive">
                                {errors.description}
                            </p>
                        )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="expense-amount">Monto</Label>
                            <Input
                                id="expense-amount"
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
                            <Label htmlFor="expense-method">
                                Método de pago
                            </Label>
                            <Select
                                value={data.method}
                                onValueChange={(value) =>
                                    setData('method', value)
                                }
                            >
                                <SelectTrigger id="expense-method">
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
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="expense-supplier">Suplidor</Label>
                            <Input
                                id="expense-supplier"
                                value={data.supplier}
                                onChange={(event) =>
                                    setData('supplier', event.target.value)
                                }
                                placeholder="Nombre del suplidor"
                            />
                            {errors.supplier && (
                                <p className="text-sm text-destructive">
                                    {errors.supplier}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="expense-reference">
                                Referencia
                            </Label>
                            <Input
                                id="expense-reference"
                                value={data.reference}
                                onChange={(event) =>
                                    setData('reference', event.target.value)
                                }
                                placeholder="Factura, comprobante…"
                            />
                            {errors.reference && (
                                <p className="text-sm text-destructive">
                                    {errors.reference}
                                </p>
                            )}
                        </div>
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
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Registrando…' : 'Registrar gasto'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
