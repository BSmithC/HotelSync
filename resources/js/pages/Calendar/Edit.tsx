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
import { formatDateTime, toDateTimeInput } from '@/lib/format';

interface Option {
    id: number;
    name: string;
}

interface ReservationOption {
    id: number;
    client_id: number;
    room_id: number;
    reserved_at: string;
    client?: { first_name: string; last_name: string } | null;
}

interface Event {
    id: number;
    title: string;
    type: string;
    room_id?: number | null;
    reservation_id?: number | null;
    starts_at: string;
    ends_at?: string | null;
    description?: string | null;
}

const types = ['evento', 'bloqueo', 'mantenimiento'];

export default function Edit({
    event,
    rooms,
    reservations,
}: {
    event: Event;
    rooms: Option[];
    reservations: ReservationOption[];
}) {
    const { data, setData, put, processing, errors, transform } = useForm({
        title: event.title,
        type: event.type,
        room_id: event.room_id ? String(event.room_id) : 'none',
        reservation_id: event.reservation_id
            ? String(event.reservation_id)
            : 'none',
        starts_at: toDateTimeInput(event.starts_at),
        ends_at: toDateTimeInput(event.ends_at),
        description: event.description ?? '',
    });

    const handleReservationChange = (value: string) => {
        setData('reservation_id', value);

        if (value === 'none') {
            return;
        }

        const reservation = reservations.find(
            (item) => String(item.id) === value,
        );

        if (reservation) {
            setData('room_id', String(reservation.room_id));
        }
    };

    const handleSubmit = (submitEvent: React.FormEvent<HTMLFormElement>) => {
        submitEvent.preventDefault();

        transform((previous) => ({
            ...previous,
            room_id: previous.room_id === 'none' ? null : previous.room_id,
            reservation_id:
                previous.reservation_id === 'none'
                    ? null
                    : previous.reservation_id,
        }));

        put(`/calendars/${event.id}`);
    };

    return (
        <>
            <Head title="Editar Evento" />

            <div className="flex min-h-[40vh] items-center justify-center p-4">
                <div className="w-full max-w-2xl rounded-xl border bg-card p-6 shadow-sm">
                    <h2 className="mb-6 text-xl font-bold text-foreground">
                        Editar Evento
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="title">
                                    Título{' '}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="title"
                                    value={data.title}
                                    onChange={(changeEvent) =>
                                        setData(
                                            'title',
                                            changeEvent.target.value,
                                        )
                                    }
                                />
                                {errors.title && (
                                    <p className="text-sm text-red-500">
                                        {errors.title}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="type">
                                    Tipo <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={data.type}
                                    onValueChange={(value) =>
                                        setData('type', value)
                                    }
                                >
                                    <SelectTrigger id="type">
                                        <SelectValue placeholder="Selecciona un tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {types.map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {type.charAt(0).toUpperCase() +
                                                    type.slice(1)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.type && (
                                    <p className="text-sm text-red-500">
                                        {errors.type}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="room_id">Habitación</Label>
                                <Select
                                    value={data.room_id}
                                    onValueChange={(value) =>
                                        setData('room_id', value)
                                    }
                                >
                                    <SelectTrigger id="room_id">
                                        <SelectValue placeholder="Sin habitación" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">
                                            Sin habitación
                                        </SelectItem>
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

                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="reservation_id">
                                    Reserva asociada
                                </Label>
                                <Select
                                    value={data.reservation_id}
                                    onValueChange={handleReservationChange}
                                >
                                    <SelectTrigger id="reservation_id">
                                        <SelectValue placeholder="Sin reserva" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">
                                            Sin reserva
                                        </SelectItem>
                                        {reservations.map((reservation) => (
                                            <SelectItem
                                                key={reservation.id}
                                                value={String(reservation.id)}
                                            >
                                                #{reservation.id}
                                                {reservation.client
                                                    ? ` · ${reservation.client.first_name} ${reservation.client.last_name}`
                                                    : ''}
                                                {' · '}
                                                {formatDateTime(
                                                    reservation.reserved_at,
                                                )}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.reservation_id && (
                                    <p className="text-sm text-red-500">
                                        {errors.reservation_id}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="starts_at">
                                    Inicio{' '}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="starts_at"
                                    type="datetime-local"
                                    value={data.starts_at}
                                    onChange={(changeEvent) =>
                                        setData(
                                            'starts_at',
                                            changeEvent.target.value,
                                        )
                                    }
                                />
                                {errors.starts_at && (
                                    <p className="text-sm text-red-500">
                                        {errors.starts_at}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="ends_at">Fin</Label>
                                <Input
                                    id="ends_at"
                                    type="datetime-local"
                                    value={data.ends_at}
                                    onChange={(changeEvent) =>
                                        setData(
                                            'ends_at',
                                            changeEvent.target.value,
                                        )
                                    }
                                />
                                {errors.ends_at && (
                                    <p className="text-sm text-red-500">
                                        {errors.ends_at}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Descripción</Label>
                            <Textarea
                                id="description"
                                value={data.description}
                                onChange={(changeEvent) =>
                                    setData(
                                        'description',
                                        changeEvent.target.value,
                                    )
                                }
                            />
                            {errors.description && (
                                <p className="text-sm text-red-500">
                                    {errors.description}
                                </p>
                            )}
                        </div>

                        <div className="flex justify-end gap-4 pt-2">
                            <Button
                                variant="outline"
                                asChild
                                className="w-full sm:w-auto"
                            >
                                <Link href="/calendars">Cancelar</Link>
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

Edit.layout = {
    breadcrumbs: [
        {
            title: 'Calendario',
            href: '/calendars',
        },
        {
            title: 'Editar',
            href: '/calendars',
        },
    ],
};
