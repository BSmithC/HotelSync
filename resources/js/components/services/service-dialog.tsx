import { useForm } from '@inertiajs/react';
import { Sparkles } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { serviceCategoryLabels } from '@/lib/service-labels';
import {
    store as storeService,
    update as updateService,
} from '@/routes/services/catalog';
import type { ServiceCatalogItem } from '@/types';

/**
 * Create or edit a catalog service. The price is the default charged when a
 * request is created; historical requests keep their own snapshot.
 */
export function ServiceDialog({
    service,
    categories,
    onClose,
}: {
    service?: ServiceCatalogItem | null;
    categories: string[];
    onClose: () => void;
}) {
    const editing = Boolean(service);

    const { data, setData, post, patch, processing, errors } = useForm({
        name: service?.name ?? '',
        category: service?.category ?? 'otro',
        description: service?.description ?? '',
        price: service ? String(service.price) : '0',
        active: service?.active ?? true,
    });

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: onClose,
        };

        if (service) {
            patch(updateService.url(service.id), options);
        } else {
            post(storeService.url(), options);
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
                        <Sparkles className="size-4 text-primary" />
                        {editing ? 'Editar servicio' : 'Nuevo servicio'}
                    </DialogTitle>
                    <DialogDescription>
                        El catálogo define el precio sugerido. Cada solicitud
                        conserva el precio con el que fue registrada.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="service-name">Nombre</Label>
                        <Input
                            id="service-name"
                            value={data.name}
                            onChange={(event) =>
                                setData('name', event.target.value)
                            }
                            placeholder="Ej. Desayuno buffet"
                            autoFocus
                        />
                        {errors.name && (
                            <p className="text-sm text-destructive">
                                {errors.name}
                            </p>
                        )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="service-category">Categoría</Label>
                            <Select
                                value={data.category}
                                onValueChange={(value) =>
                                    setData('category', value)
                                }
                            >
                                <SelectTrigger id="service-category">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((value) => (
                                        <SelectItem key={value} value={value}>
                                            {serviceCategoryLabels[value] ??
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
                            <Label htmlFor="service-price">Precio</Label>
                            <Input
                                id="service-price"
                                type="number"
                                min="0"
                                step="0.01"
                                value={data.price}
                                onChange={(event) =>
                                    setData('price', event.target.value)
                                }
                            />
                            {errors.price && (
                                <p className="text-sm text-destructive">
                                    {errors.price}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="service-description">Descripción</Label>
                        <Textarea
                            id="service-description"
                            value={data.description}
                            onChange={(event) =>
                                setData('description', event.target.value)
                            }
                            rows={3}
                            placeholder="Detalle opcional del servicio"
                        />
                        {errors.description && (
                            <p className="text-sm text-destructive">
                                {errors.description}
                            </p>
                        )}
                    </div>

                    <div className="flex items-start gap-3 rounded-lg border border-border px-3 py-3">
                        <Checkbox
                            id="service-active"
                            checked={data.active}
                            onCheckedChange={(checked) =>
                                setData('active', checked === true)
                            }
                        />
                        <div className="space-y-0.5">
                            <Label htmlFor="service-active">
                                Servicio activo
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Los servicios inactivos no aceptan nuevas
                                solicitudes y conservan su historial.
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
                                  : 'Crear servicio'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
