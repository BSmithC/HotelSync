import { useForm } from '@inertiajs/react';
import { Boxes } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
    inventoryCategoryLabels,
    inventoryUnitLabels,
} from '@/lib/inventory-labels';
import {
    store as storeItem,
    update as updateItem,
} from '@/routes/inventory/items';
import type { InventoryItem } from '@/types';

/**
 * Create or edit a catalog item. Stock is never edited here: it only changes
 * through the movement ledger.
 */
export function ItemDialog({
    item,
    categories,
    units,
    onClose,
}: {
    item?: InventoryItem | null;
    categories: string[];
    units: string[];
    onClose: () => void;
}) {
    const editing = Boolean(item);

    const { data, setData, post, patch, processing, errors } = useForm({
        name: item?.name ?? '',
        sku: item?.sku ?? '',
        category: item?.category ?? 'otro',
        unit: item?.unit ?? 'unidad',
        min_stock: item ? String(item.min_stock) : '0',
        unit_cost: item ? String(item.unit_cost) : '0',
        active: item?.active ?? true,
    });

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: onClose,
        };

        if (item) {
            patch(updateItem.url(item.id), options);
        } else {
            post(storeItem.url(), options);
        }
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
                        <Boxes className="size-4 text-primary" />
                        {editing ? 'Editar artículo' : 'Nuevo artículo'}
                    </DialogTitle>
                    <DialogDescription>
                        El stock solo cambia con entradas, salidas y ajustes
                        registrados en el libro de movimientos.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="item-name">Nombre</Label>
                            <Input
                                id="item-name"
                                value={data.name}
                                onChange={(event) =>
                                    setData('name', event.target.value)
                                }
                                placeholder="Ej. Jabón de baño"
                                autoFocus
                            />
                            {errors.name && (
                                <p className="text-sm text-destructive">
                                    {errors.name}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="item-sku">SKU / código</Label>
                            <Input
                                id="item-sku"
                                value={data.sku}
                                onChange={(event) =>
                                    setData('sku', event.target.value)
                                }
                                placeholder="Opcional"
                            />
                            {errors.sku && (
                                <p className="text-sm text-destructive">
                                    {errors.sku}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="item-category">Categoría</Label>
                            <Select
                                value={data.category}
                                onValueChange={(value) =>
                                    setData('category', value)
                                }
                            >
                                <SelectTrigger id="item-category">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((value) => (
                                        <SelectItem key={value} value={value}>
                                            {inventoryCategoryLabels[value] ??
                                                value}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.category && (
                                <p className="text-sm text-destructive">
                                    {errors.category}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="item-unit">Unidad</Label>
                            <Select
                                value={data.unit}
                                onValueChange={(value) =>
                                    setData('unit', value)
                                }
                            >
                                <SelectTrigger id="item-unit">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {units.map((value) => (
                                        <SelectItem key={value} value={value}>
                                            {inventoryUnitLabels[value] ??
                                                value}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.unit && (
                                <p className="text-sm text-destructive">
                                    {errors.unit}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="item-min-stock">Stock mínimo</Label>
                            <Input
                                id="item-min-stock"
                                type="number"
                                min="0"
                                step="0.01"
                                value={data.min_stock}
                                onChange={(event) =>
                                    setData('min_stock', event.target.value)
                                }
                            />
                            {errors.min_stock && (
                                <p className="text-sm text-destructive">
                                    {errors.min_stock}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="item-unit-cost">
                                Costo unitario
                            </Label>
                            <Input
                                id="item-unit-cost"
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
                    </div>

                    <div className="flex items-start gap-3 rounded-lg border border-border px-3 py-3">
                        <Checkbox
                            id="item-active"
                            checked={data.active}
                            onCheckedChange={(checked) =>
                                setData('active', checked === true)
                            }
                        />
                        <div className="space-y-0.5">
                            <Label htmlFor="item-active">Artículo activo</Label>
                            <p className="text-xs text-muted-foreground">
                                Los artículos inactivos no aceptan movimientos y
                                conservan su historial.
                            </p>
                            {errors.active && (
                                <p className="text-sm text-destructive">
                                    {errors.active}
                                </p>
                            )}
                        </div>
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
                            {processing
                                ? 'Guardando…'
                                : editing
                                  ? 'Guardar cambios'
                                  : 'Crear artículo'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
