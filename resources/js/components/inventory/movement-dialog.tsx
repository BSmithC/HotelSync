import { useForm } from '@inertiajs/react';
import {
    ArrowDownToLine,
    ArrowUpFromLine,
    SlidersHorizontal,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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
import { createIdempotencyKey } from '@/lib/idempotency';
import {
    inventoryMovementTypeLabels,
    inventoryUnitLabels,
} from '@/lib/inventory-labels';
import { store as storeMovement } from '@/routes/inventory/movements';
import type { InventoryItemOption } from '@/types';

const typeIcons: Record<string, LucideIcon> = {
    entrada: ArrowDownToLine,
    salida: ArrowUpFromLine,
    ajuste: SlidersHorizontal,
};

/**
 * Register an entry, an exit or a physical count adjustment. The resulting
 * stock is previewed but the server is the one that rejects negative stock.
 */
export function MovementDialog({
    items,
    defaultItem,
    defaultDate,
    canAdjust,
    onClose,
}: {
    items: InventoryItemOption[];
    defaultItem?: InventoryItemOption | null;
    defaultDate: string;
    canAdjust: boolean;
    onClose: () => void;
}) {
    const initialItem = defaultItem ?? items[0] ?? null;
    const [key] = useState(() => createIdempotencyKey());

    const { data, setData, post, processing, errors } = useForm({
        item_id: initialItem ? String(initialItem.id) : '',
        type: 'entrada',
        quantity: '',
        counted_stock: initialItem ? String(initialItem.stock) : '',
        unit_cost: initialItem ? String(initialItem.unit_cost) : '',
        reason: '',
        reference: '',
        occurred_at: defaultDate,
        idempotency_key: key,
    });

    // The server may report the error on the item relation instead of item_id.
    const recordErrors = errors as unknown as Record<
        string,
        string | undefined
    >;

    const selected = items.find((item) => String(item.id) === data.item_id);
    const currentStock = Number(selected?.stock ?? 0);
    const quantity = Number(data.quantity || 0);
    const counted = Number(data.counted_stock || 0);

    const resultingStock =
        data.type === 'entrada'
            ? currentStock + quantity
            : data.type === 'salida'
              ? currentStock - quantity
              : counted;

    const previewInvalid = resultingStock < 0;

    const handleItem = (value: string) => {
        const item = items.find((entry) => String(entry.id) === value);

        setData((current) => ({
            ...current,
            item_id: value,
            unit_cost: item ? String(item.unit_cost) : current.unit_cost,
            counted_stock:
                current.type === 'ajuste' && item
                    ? String(item.stock)
                    : current.counted_stock,
        }));
    };

    const handleType = (value: string) => {
        setData((current) => ({
            ...current,
            type: value,
            quantity: '',
            counted_stock: value === 'ajuste' ? String(currentStock) : '',
        }));
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (data.item_id === '') {
            return;
        }

        post(storeMovement.url({ item: data.item_id }), {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    const TypeIcon = typeIcons[data.type] ?? ArrowDownToLine;

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
                        <TypeIcon className="size-4 text-primary" />
                        Registrar movimiento
                    </DialogTitle>
                    <DialogDescription>
                        Cada movimiento queda en el libro con usuario, fecha y
                        trazabilidad. No se elimina: se anula con un reverso.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="movement-item">Artículo</Label>
                        <Select value={data.item_id} onValueChange={handleItem}>
                            <SelectTrigger id="movement-item">
                                <SelectValue placeholder="Selecciona un artículo" />
                            </SelectTrigger>
                            <SelectContent>
                                {items.map((item) => (
                                    <SelectItem
                                        key={item.id}
                                        value={String(item.id)}
                                    >
                                        {item.name}
                                        {item.sku
                                            ? ` · ${item.sku}`
                                            : ''} · {Number(item.stock)}{' '}
                                        {inventoryUnitLabels[item.unit] ??
                                            item.unit}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {items.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                                Primero crea un artículo en el catálogo.
                            </p>
                        )}
                        {recordErrors.inventory_item_id && (
                            <p className="text-sm text-destructive">
                                {recordErrors.inventory_item_id}
                            </p>
                        )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="movement-type">Tipo</Label>
                            <Select
                                value={data.type}
                                onValueChange={handleType}
                            >
                                <SelectTrigger id="movement-type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(
                                        inventoryMovementTypeLabels,
                                    ).map(([value, label]) => (
                                        <SelectItem
                                            key={value}
                                            value={value}
                                            disabled={
                                                value === 'ajuste' && !canAdjust
                                            }
                                        >
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.type && (
                                <p className="text-sm text-destructive">
                                    {errors.type}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="movement-date">Fecha</Label>
                            <Input
                                id="movement-date"
                                type="date"
                                value={data.occurred_at}
                                onChange={(event) =>
                                    setData('occurred_at', event.target.value)
                                }
                            />
                            {errors.occurred_at && (
                                <p className="text-sm text-destructive">
                                    {errors.occurred_at}
                                </p>
                            )}
                        </div>
                    </div>

                    {data.type === 'ajuste' ? (
                        <div className="space-y-2">
                            <Label htmlFor="movement-counted">
                                Conteo físico
                            </Label>
                            <Input
                                id="movement-counted"
                                type="number"
                                min="0"
                                step="0.01"
                                value={data.counted_stock}
                                onChange={(event) =>
                                    setData('counted_stock', event.target.value)
                                }
                            />
                            <p className="text-xs text-muted-foreground">
                                Stock actual: {currentStock}. El ajuste registra
                                la diferencia como un movimiento.
                            </p>
                            {errors.counted_stock && (
                                <p className="text-sm text-destructive">
                                    {errors.counted_stock}
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Label htmlFor="movement-quantity">Cantidad</Label>
                            <Input
                                id="movement-quantity"
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={data.quantity}
                                onChange={(event) =>
                                    setData('quantity', event.target.value)
                                }
                                placeholder="0.00"
                            />
                            {errors.quantity && (
                                <p className="text-sm text-destructive">
                                    {errors.quantity}
                                </p>
                            )}
                        </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="movement-cost">
                                Costo unitario
                            </Label>
                            <Input
                                id="movement-cost"
                                type="number"
                                min="0"
                                step="0.01"
                                value={data.unit_cost}
                                onChange={(event) =>
                                    setData('unit_cost', event.target.value)
                                }
                            />
                            {errors.unit_cost && (
                                <p className="text-sm text-destructive">
                                    {errors.unit_cost}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="movement-reference">
                                Referencia
                            </Label>
                            <Input
                                id="movement-reference"
                                value={data.reference}
                                onChange={(event) =>
                                    setData('reference', event.target.value)
                                }
                                placeholder="Factura, orden…"
                            />
                            {errors.reference && (
                                <p className="text-sm text-destructive">
                                    {errors.reference}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="movement-reason">
                            {data.type === 'ajuste'
                                ? 'Motivo del ajuste'
                                : 'Motivo / nota'}
                        </Label>
                        <Textarea
                            id="movement-reason"
                            value={data.reason}
                            onChange={(event) =>
                                setData('reason', event.target.value)
                            }
                            rows={2}
                            placeholder={
                                data.type === 'ajuste'
                                    ? 'Ej. Conteo físico mensual'
                                    : 'Detalle opcional'
                            }
                        />
                        {errors.reason && (
                            <p className="text-sm text-destructive">
                                {errors.reason}
                            </p>
                        )}
                    </div>

                    <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                        <span className="text-muted-foreground">
                            Stock resultante:{' '}
                        </span>
                        <strong
                            className={
                                previewInvalid ? 'text-destructive' : undefined
                            }
                        >
                            {Number.isFinite(resultingStock)
                                ? resultingStock.toFixed(2)
                                : '—'}
                        </strong>
                        {previewInvalid && (
                            <span className="ml-2 text-xs text-destructive">
                                El stock no puede quedar negativo.
                            </span>
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
                            disabled={
                                processing ||
                                data.item_id === '' ||
                                previewInvalid
                            }
                        >
                            {processing ? 'Registrando…' : 'Registrar'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
