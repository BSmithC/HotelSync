import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Pencil, Receipt } from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';

interface Reservation {
    id: number;
    client_id: number;
    room_id: number;
    reserved_at: string;
    finished_at?: string | null;
    guests: number;
    status: string;
    active: boolean;
    notes?: string | null;
    client?: { id: number; first_name: string; last_name: string } | null;
    room?: { id: number; name: string } | null;
    user?: { id: number; name: string } | null;
}

export default function Show({ reservation }: { reservation: Reservation }) {
    const client = reservation.client;
    const room = reservation.room;

    return (
        <>
            <Head title={`Reservación #${reservation.id}`} />

            <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
                <Card>
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div>
                            <CardTitle>Reservación #{reservation.id}</CardTitle>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {client
                                    ? `${client.first_name} ${client.last_name}`
                                    : 'Cliente no disponible'}
                            </p>
                        </div>
                        <StatusBadge
                            status={reservation.status}
                            active={reservation.active}
                        />
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                            <div>
                                <dt className="text-muted-foreground">
                                    Cliente
                                </dt>
                                <dd className="font-medium">
                                    {client ? (
                                        <Link
                                            href={`/clients/${client.id}`}
                                            className="text-primary hover:underline"
                                        >
                                            {client.first_name}{' '}
                                            {client.last_name}
                                        </Link>
                                    ) : (
                                        '—'
                                    )}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">
                                    Habitación
                                </dt>
                                <dd className="font-medium">
                                    {room ? (
                                        <Link
                                            href={`/rooms/${room.id}`}
                                            className="text-primary hover:underline"
                                        >
                                            {room.name}
                                        </Link>
                                    ) : (
                                        '—'
                                    )}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">
                                    Entrada
                                </dt>
                                <dd className="font-medium">
                                    {formatDateTime(reservation.reserved_at)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">
                                    Salida
                                </dt>
                                <dd className="font-medium">
                                    {formatDateTime(reservation.finished_at)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">
                                    Huéspedes
                                </dt>
                                <dd className="font-medium">
                                    {reservation.guests}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">
                                    Registrada por
                                </dt>
                                <dd className="font-medium">
                                    {reservation.user?.name ?? '—'}
                                </dd>
                            </div>
                            <div className="sm:col-span-2">
                                <dt className="text-muted-foreground">Notas</dt>
                                <dd className="font-medium">
                                    {reservation.notes || '—'}
                                </dd>
                            </div>
                        </dl>

                        <div className="flex flex-wrap justify-end gap-2">
                            <Button variant="outline" asChild>
                                <Link href="/reservations">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Volver
                                </Link>
                            </Button>
                            <Button variant="outline" asChild>
                                <Link
                                    href={`/bills/create?reservation_id=${reservation.id}&client_id=${reservation.client_id}`}
                                >
                                    <Receipt className="mr-2 h-4 w-4" />
                                    Registrar factura
                                </Link>
                            </Button>
                            <Button asChild>
                                <Link
                                    href={`/reservations/${reservation.id}/edit`}
                                >
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
            title: 'Reservaciones',
            href: '/reservations',
        },
        {
            title: 'Detalle',
            href: '/reservations',
        },
    ],
};
