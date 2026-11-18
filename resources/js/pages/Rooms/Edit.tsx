import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
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
import type { AreaData, RoomData } from '@/types';

type Props = {
    room: RoomData;
    areas: AreaData[];
};

export default function Edit({ room, areas }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        settings: true,
        name: room.name,
        capacity: room.capacity,
        shape: room.shape,
        area_id: String(room.area_id),
        description: room.description ?? '',
        price: room.price ?? '',
        phone: room.phone ?? '',
        status: room.status ?? 'disponible',
    });

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        put(`/rooms/${room.id}`);
    };

    return (
        <>
            <Head title={`Editar ${room.name}`} />

            <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
                <div className="rounded-2xl border bg-card p-6 shadow-sm">
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold tracking-tight">
                            Editar habitación
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {room.area?.name ?? 'Sin área'} · ID {room.id}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nombre</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(event) =>
                                        setData('name', event.target.value)
                                    }
                                />
                                {errors.name && (
                                    <p className="text-sm text-destructive">
                                        {errors.name}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="capacity">Capacidad</Label>
                                <Input
                                    id="capacity"
                                    type="number"
                                    min={1}
                                    value={data.capacity}
                                    onChange={(event) =>
                                        setData(
                                            'capacity',
                                            Number(event.target.value),
                                        )
                                    }
                                />
                                {errors.capacity && (
                                    <p className="text-sm text-destructive">
                                        {errors.capacity}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="area">Área</Label>
                                <Select
                                    value={data.area_id}
                                    onValueChange={(value) =>
                                        setData('area_id', value)
                                    }
                                >
                                    <SelectTrigger id="area">
                                        <SelectValue placeholder="Selecciona un área" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {areas.map((area) => (
                                            <SelectItem
                                                key={area.id}
                                                value={String(area.id)}
                                            >
                                                {area.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.area_id && (
                                    <p className="text-sm text-destructive">
                                        {errors.area_id}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="shape">Forma</Label>
                                <Select
                                    value={data.shape}
                                    onValueChange={(value) =>
                                        setData('shape', value)
                                    }
                                >
                                    <SelectTrigger id="shape">
                                        <SelectValue placeholder="Selecciona la forma" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="rectangle">
                                            Rectángulo
                                        </SelectItem>
                                        <SelectItem value="square">
                                            Cuadrado
                                        </SelectItem>
                                        <SelectItem value="circle">
                                            Círculo
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.shape && (
                                    <p className="text-sm text-destructive">
                                        {errors.shape}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="price">Tarifa (RD$)</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    min={0}
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

                            <div className="space-y-2">
                                <Label htmlFor="status">Estado</Label>
                                <Select
                                    value={data.status}
                                    onValueChange={(value) =>
                                        setData('status', value)
                                    }
                                >
                                    <SelectTrigger id="status">
                                        <SelectValue placeholder="Selecciona un estado" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="disponible">
                                            Disponible
                                        </SelectItem>
                                        <SelectItem value="ocupada">
                                            Ocupada
                                        </SelectItem>
                                        <SelectItem value="reservada">
                                            Reservada
                                        </SelectItem>
                                        <SelectItem value="mantenimiento">
                                            Mantenimiento
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.status && (
                                    <p className="text-sm text-destructive">
                                        {errors.status}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Teléfono</Label>
                            <Input
                                id="phone"
                                value={data.phone}
                                onChange={(event) =>
                                    setData('phone', event.target.value)
                                }
                                placeholder="809-000-0000"
                            />
                            {errors.phone && (
                                <p className="text-sm text-destructive">
                                    {errors.phone}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Descripción</Label>
                            <Textarea
                                id="description"
                                value={data.description}
                                onChange={(event) =>
                                    setData('description', event.target.value)
                                }
                                placeholder="Detalles de la habitación"
                            />
                            {errors.description && (
                                <p className="text-sm text-destructive">
                                    {errors.description}
                                </p>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" asChild>
                                <Link href="/rooms">Cancelar</Link>
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Guardando...' : 'Guardar'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}

Edit.layout = {
    breadcrumbs: [
        {
            title: 'Habitaciones',
            href: '/rooms',
        },
        {
            title: 'Editar habitación',
            href: '/rooms',
        },
    ],
};
