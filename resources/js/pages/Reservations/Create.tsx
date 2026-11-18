import { Head, useForm, Link } from '@inertiajs/react';
import React from 'react';
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

interface Option {
    id: number;
    name: string;
}

interface ClientOption {
    id: number;
    first_name: string;
    last_name: string;
}

const statuses = [
    'Pendiente',
    'Confirmada',
    'En curso',
    'Finalizada',
    'Cancelada',
];

export default function Create({
    clients,
    rooms,
}: {
    clients: ClientOption[];
    rooms: Option[];
}) {
    const { data, setData, post, processing, errors } = useForm({
        client_id: '',
        room_id: '',
        reserved_at: '',
        finished_at: '',
        guests: 1,
        status: 'Pendiente',
        notes: '',
    });

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        post('/reservations');
    };

    return (
        <>
            <Head title="Nueva Reservación" />

            <div className="flex min-h-[40vh] items-center justify-center p-4">
                <div className="w-full max-w-2xl rounded-xl border bg-card p-6 shadow-sm">
                    <h2 className="mb-6 text-xl font-bold text-foreground">
                        Registrar Reservación
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="client_id">
                                    Cliente{' '}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={data.client_id}
                                    onValueChange={(value) =>
                                        setData('client_id', value)
                                    }
                                >
                                    <SelectTrigger id="client_id">
                                        <SelectValue placeholder="Selecciona un cliente" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clients.map((client) => (
                                            <SelectItem
                                                key={client.id}
                                                value={String(client.id)}
                                            >
                                                {client.first_name}{' '}
                                                {client.last_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.client_id && (
                                    <p className="text-sm text-red-500">
                                        {errors.client_id}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="room_id">
                                    Habitación{' '}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={data.room_id}
                                    onValueChange={(value) =>
                                        setData('room_id', value)
                                    }
                                >
                                    <SelectTrigger id="room_id">
                                        <SelectValue placeholder="Selecciona una habitación" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {rooms.map((room) => (
                                            <SelectItem
                                                key={room.id}
                                                value={String(room.id)}
                                            >
                                                {room.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.room_id && (
                                    <p className="text-sm text-red-500">
                                        {errors.room_id}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="reserved_at">
                                    Entrada{' '}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="reserved_at"
                                    type="datetime-local"
                                    value={data.reserved_at}
                                    onChange={(event) =>
                                        setData(
                                            'reserved_at',
                                            event.target.value,
                                        )
                                    }
                                />
                                {errors.reserved_at && (
                                    <p className="text-sm text-red-500">
                                        {errors.reserved_at}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="finished_at">Salida</Label>
                                <Input
                                    id="finished_at"
                                    type="datetime-local"
                                    value={data.finished_at}
                                    onChange={(event) =>
                                        setData(
                                            'finished_at',
                                            event.target.value,
                                        )
                                    }
                                />
                                {errors.finished_at && (
                                    <p className="text-sm text-red-500">
                                        {errors.finished_at}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="guests">
                                    Huéspedes{' '}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="guests"
                                    type="number"
                                    min={1}
                                    value={data.guests}
                                    onChange={(event) =>
                                        setData(
                                            'guests',
                                            Number(event.target.value),
                                        )
                                    }
                                />
                                {errors.guests && (
                                    <p className="text-sm text-red-500">
                                        {errors.guests}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status">
                                    Estado{' '}
                                    <span className="text-red-500">*</span>
                                </Label>
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
                                        {statuses.map((status) => (
                                            <SelectItem
                                                key={status}
                                                value={status}
                                            >
                                                {status}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.status && (
                                    <p className="text-sm text-red-500">
                                        {errors.status}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Notas</Label>
                            <Textarea
                                id="notes"
                                placeholder="Detalles de la reserva, llegada estimada, etc."
                                value={data.notes}
                                onChange={(event) =>
                                    setData('notes', event.target.value)
                                }
                            />
                            {errors.notes && (
                                <p className="text-sm text-red-500">
                                    {errors.notes}
                                </p>
                            )}
                        </div>

                        <div className="flex justify-end gap-4 pt-2">
                            <Button
                                variant="outline"
                                asChild
                                className="w-full sm:w-auto"
                            >
                                <Link href="/reservations">Cancelar</Link>
                            </Button>

                            <Button
                                type="submit"
                                disabled={processing}
                                className="w-full sm:w-auto"
                            >
                                {processing ? 'Guardando...' : 'Guardar'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}

Create.layout = {
    breadcrumbs: [
        {
            title: 'Reservaciones',
            href: '/reservations',
        },
        {
            title: 'Nueva',
            href: '/reservations/create',
        },
    ],
};
