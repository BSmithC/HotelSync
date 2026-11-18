import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';

interface Event {
    id: number;
    title: string;
    type: string;
    starts_at: string;
    ends_at?: string | null;
    description?: string | null;
    active: boolean;
    room?: { id: number; name: string } | null;
    reservation?: {
        id: number;
        client?: { first_name: string; last_name: string } | null;
    } | null;
}

const typeVariant = (type: string) => {
    if (type === 'bloqueo') {
        return 'destructive' as const;
    }

    if (type === 'mantenimiento') {
        return 'outline' as const;
    }

    return 'secondary' as const;
};

export default function Show({ event }: { event: Event }) {
    return (
        <>
            <Head title={event.title} />

            <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
                <Card>
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div>
                            <CardTitle>{event.title}</CardTitle>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Evento #{event.id}
                            </p>
                        </div>
                        <Badge variant={typeVariant(event.type)}>
                            {event.type.charAt(0).toUpperCase() +
                                event.type.slice(1)}
                        </Badge>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                            <div>
                                <dt className="text-muted-foreground">
                                    Habitación
                                </dt>
                                <dd className="font-medium">
                                    {event.room ? (
                                        <Link
                                            href={`/rooms/${event.room.id}`}
                                            className="text-primary hover:underline"
                                        >
                                            {event.room.name}
                                        </Link>
                                    ) : (
                                        '—'
                                    )}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">
                                    Reserva
                                </dt>
                                <dd className="font-medium">
                                    {event.reservation ? (
                                        <Link
                                            href={`/reservations/${event.reservation.id}`}
                                            className="text-primary hover:underline"
                                        >
                                            #{event.reservation.id}
                                            {event.reservation.client
                                                ? ` · ${event.reservation.client.first_name} ${event.reservation.client.last_name}`
                                                : ''}
                                        </Link>
                                    ) : (
                                        '—'
                                    )}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">
                                    Inicio
                                </dt>
                                <dd className="font-medium">
                                    {formatDateTime(event.starts_at)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">Fin</dt>
                                <dd className="font-medium">
                                    {formatDateTime(event.ends_at)}
                                </dd>
                            </div>
                            <div className="sm:col-span-2">
                                <dt className="text-muted-foreground">
                                    Descripción
                                </dt>
                                <dd className="font-medium">
                                    {event.description || '—'}
                                </dd>
                            </div>
                        </dl>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" asChild>
                                <Link href="/calendars">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Volver
                                </Link>
                            </Button>
                            <Button asChild>
                                <Link href={`/calendars/${event.id}/edit`}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Editar
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

Show.layout = {
    breadcrumbs: [
        {
            title: 'Calendario',
            href: '/calendars',
        },
        {
            title: 'Detalle',
            href: '/calendars',
        },
    ],
};
