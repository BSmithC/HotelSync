import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
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
import { AREA_TYPE_LABELS, DEFAULT_AREA_COLOR } from '@/lib/room-status';
import type { AreaData, AreaType } from '@/types';

const AREA_TYPES: AreaType[] = [
    'edificio',
    'piso',
    'zona',
    'pasillo',
    'jardin',
    'piscina',
    'terraza',
    'salon',
    'otro',
];

/**
 * Creates or edits a map area.
 */
export function AreaFormModal({
    open,
    area,
    buildings,
    onClose,
    onSaved,
}: {
    open: boolean;
    area: AreaData | null;
    buildings: { id: number; name: string }[];
    onClose: () => void;
    onSaved: () => void;
}) {
    const { data, setData, post, patch, processing, errors, reset, transform } =
        useForm({
            name: '',
            type: 'zona' as AreaType,
            color: DEFAULT_AREA_COLOR,
            floor: '',
            building_id: 'none',
            width: 400,
            height: 300,
            x: 20,
            y: 20,
        });

    useEffect(() => {
        if (!open) {
            return;
        }

        if (area) {
            setData({
                name: area.name,
                type: area.type,
                color: area.color ?? DEFAULT_AREA_COLOR,
                floor: area.floor === null ? '' : String(area.floor),
                building_id:
                    area.building_id === null
                        ? 'none'
                        : String(area.building_id),
                width: area.width,
                height: area.height,
                x: area.x,
                y: area.y,
            });
        } else {
            reset();
        }
    }, [area, open, reset, setData]);

    transform((values) => ({
        ...values,
        floor: values.floor === '' ? null : Number(values.floor),
        building_id:
            values.building_id === '' || values.building_id === 'none'
                ? null
                : Number(values.building_id),
        width: Number(values.width),
        height: Number(values.height),
        x: Number(values.x),
        y: Number(values.y),
    }));

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onSaved();
                onClose();
            },
        };

        if (area) {
            patch(`/areas/${area.id}`, options);

            return;
        }

        post('/areas', options);
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(value) => {
                if (!value) {
                    onClose();
                }
            }}
        >
            <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {area ? 'Editar área' : 'Nueva área'}
                    </DialogTitle>
                    <DialogDescription>
                        Las áreas agrupan habitaciones: pisos, jardines,
                        pasillos, piscinas o terrazas.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="area-name">Nombre</Label>
                        <Input
                            id="area-name"
                            value={data.name}
                            onChange={(event) =>
                                setData('name', event.target.value)
                            }
                            placeholder="Ej. Planta alta"
                        />
                        {errors.name && (
                            <p className="text-sm text-destructive">
                                {errors.name}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="area-type">Tipo</Label>
                            <Select
                                value={data.type}
                                onValueChange={(value) =>
                                    setData('type', value as AreaType)
                                }
                            >
                                <SelectTrigger id="area-type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {AREA_TYPES.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {AREA_TYPE_LABELS[type]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="area-color">Color</Label>
                            <div className="flex items-center gap-2">
                                <input
                                    id="area-color"
                                    type="color"
                                    value={data.color}
                                    onChange={(event) =>
                                        setData('color', event.target.value)
                                    }
                                    className="h-9 w-12 cursor-pointer rounded border bg-background p-1"
                                />
                                <Input
                                    value={data.color}
                                    onChange={(event) =>
                                        setData('color', event.target.value)
                                    }
                                    aria-label="Color hexadecimal del área"
                                />
                            </div>
                            {errors.color && (
                                <p className="text-sm text-destructive">
                                    {errors.color}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="area-floor">Piso</Label>
                            <Input
                                id="area-floor"
                                type="number"
                                min={0}
                                value={data.floor}
                                onChange={(event) =>
                                    setData('floor', event.target.value)
                                }
                                placeholder="Opcional"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="area-building">Edificio</Label>
                            <Select
                                value={data.building_id}
                                onValueChange={(value) =>
                                    setData('building_id', value)
                                }
                            >
                                <SelectTrigger id="area-building">
                                    <SelectValue placeholder="Sin edificio" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">
                                        Sin edificio
                                    </SelectItem>
                                    {buildings.map((building) => (
                                        <SelectItem
                                            key={building.id}
                                            value={String(building.id)}
                                        >
                                            {building.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="area-width">Ancho</Label>
                            <Input
                                id="area-width"
                                type="number"
                                min={100}
                                max={5000}
                                value={data.width}
                                onChange={(event) =>
                                    setData('width', Number(event.target.value))
                                }
                            />
                            {errors.width && (
                                <p className="text-sm text-destructive">
                                    {errors.width}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="area-height">Alto</Label>
                            <Input
                                id="area-height"
                                type="number"
                                min={100}
                                max={5000}
                                value={data.height}
                                onChange={(event) =>
                                    setData(
                                        'height',
                                        Number(event.target.value),
                                    )
                                }
                            />
                            {errors.height && (
                                <p className="text-sm text-destructive">
                                    {errors.height}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="area-x">Posición X</Label>
                            <Input
                                id="area-x"
                                type="number"
                                min={0}
                                value={data.x}
                                onChange={(event) =>
                                    setData('x', Number(event.target.value))
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="area-y">Posición Y</Label>
                            <Input
                                id="area-y"
                                type="number"
                                min={0}
                                value={data.y}
                                onChange={(event) =>
                                    setData('y', Number(event.target.value))
                                }
                            />
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
                                ? 'Guardando...'
                                : area
                                  ? 'Guardar cambios'
                                  : 'Crear área'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
