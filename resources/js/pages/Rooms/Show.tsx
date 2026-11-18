import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { RoomData } from '@/types';

type Props = {
    room: RoomData;
};

export default function Show({ room }: Props) {
    return (
        <>
            <Head title={room.name} />

            <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
                <Card>
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div>
                            <CardTitle>{room.name}</CardTitle>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {room.area?.name ?? 'Sin área'} · Capacidad{' '}
                                {room.capacity}
                            </p>
                        </div>
                        <Badge variant={room.active ? 'default' : 'secondary'}>
                            {room.active ? 'Activa' : 'Inactiva'}
                        </Badge>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                            <div>
                                <dt className="text-muted-foreground">
                                    Estado operativo
                                </dt>
                                <dd className="font-medium">
                                    {room.status || '—'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">
                                    Tarifa
                                </dt>
                                <dd className="font-medium">
                                    {room.price
                                        ? `RD$ ${Number(room.price).toFixed(2)}`
                                        : 'No definida'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">
                                    Teléfono
                                </dt>
                                <dd className="font-medium">
                                    {room.phone || '—'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">Forma</dt>
                                <dd className="font-medium">{room.shape}</dd>
                            </div>
                            <div className="sm:col-span-2">
                                <dt className="text-muted-foreground">
                                    Descripción
                                </dt>
                                <dd className="font-medium">
                                    {room.description || 'Sin descripción'}
                                </dd>
                            </div>
                        </dl>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" asChild>
                                <Link href="/rooms">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Volver
                                </Link>
                            </Button>
                            <Button asChild>
                                <Link href={`/rooms/${room.id}/edit`}>
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
            title: 'Habitaciones',
            href: '/rooms',
        },
        {
            title: 'Detalle',
            href: '/rooms',
        },
    ],
};
