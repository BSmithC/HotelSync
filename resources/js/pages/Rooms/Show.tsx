import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, Pencil } from 'lucide-react';
import { RoomActions } from '@/components/rooms/room-actions';
import { RoomDetailsContent } from '@/components/rooms/room-details-content';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/use-permissions';
import type { RoomDetails, RoomPanelOptions, RoomSharedProps } from '@/types';

type Props = RoomPanelOptions & {
    room: RoomDetails;
};

/**
 * Full room sheet. It shares the drawer content and the same actions, so the
 * Show route stays useful without duplicating business logic.
 */
export default function Show({
    room,
    roomsForAssignment,
    roomsForIncidents,
    reservationsForIncidents,
    roomStatuses,
    incidentTypes,
    incidentSeverities,
}: Props) {
    const { roomStatusColors } = usePage<RoomSharedProps>().props;
    const { can } = usePermissions();

    return (
        <>
            <Head title={room.name} />

            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">
                            {room.name}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Ficha operativa de la habitación. Los datos se
                            actualizan con cada operación de recepción.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" asChild>
                            <Link href="/rooms">
                                <ArrowLeft className="size-4" />
                                Volver al plano
                            </Link>
                        </Button>
                        {can('rooms.manage') && (
                            <Button asChild>
                                <Link href={`/rooms/${room.id}/edit`}>
                                    <Pencil className="size-4" />
                                    Editar
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
                    <div className="flex min-h-[480px] flex-col overflow-hidden rounded-xl border bg-card">
                        <RoomDetailsContent
                            room={room}
                            colors={roomStatusColors}
                            className="h-full"
                        />
                    </div>

                    <div className="flex flex-col gap-3">
                        <div className="overflow-hidden rounded-xl border bg-card">
                            <RoomActions
                                room={room}
                                options={{
                                    roomsForAssignment,
                                    roomsForIncidents,
                                    reservationsForIncidents,
                                    roomStatuses,
                                    incidentTypes,
                                    incidentSeverities,
                                }}
                                onRefresh={() => {
                                    router.reload({
                                        only: [
                                            'room',
                                            'roomsForAssignment',
                                            'roomsForIncidents',
                                            'reservationsForIncidents',
                                        ],
                                    });
                                }}
                            />
                        </div>

                        <p className="text-xs text-muted-foreground">
                            Las acciones de recepción requieren los permisos
                            correspondientes; el servidor valida cada cambio.
                        </p>
                    </div>
                </div>
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
