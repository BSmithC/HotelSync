import { Link, router } from '@inertiajs/react';
import {
    DoorOpen,
    ExternalLink,
    LogIn,
    LogOut,
    Pencil,
    RefreshCw,
    Repeat,
    Trash2,
    TriangleAlert,
} from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { ChangeRoomDialog } from '@/components/reception/change-room-dialog';
import { CheckInDialog } from '@/components/reception/check-in-dialog';
import { IncidentDialog } from '@/components/reception/incident-dialog';
import { RoomStatusDialog } from '@/components/reception/room-status-dialog';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/use-permissions';
import type {
    ReceptionReservation,
    ReservationOption,
    RoomDetails,
    RoomPanelOptions,
} from '@/types';

/**
 * Actions available from the side panel.
 *
 * Every button only reflects a backend ability; the server still validates the
 * transition. Reception actions reuse the same dialogs as the reception center.
 */
export function RoomActions({
    room,
    options,
    onRefresh,
}: {
    room: RoomDetails;
    options: RoomPanelOptions;
    onRefresh: () => void;
}) {
    const { can } = usePermissions();

    const [checkInTarget, setCheckInTarget] =
        useState<ReceptionReservation | null>(null);
    const [changeRoomTarget, setChangeRoomTarget] =
        useState<ReceptionReservation | null>(null);
    const [statusOpen, setStatusOpen] = useState(false);
    const [incidentOpen, setIncidentOpen] = useState(false);
    const [checkOutOpen, setCheckOutOpen] = useState(false);
    const [deactivateOpen, setDeactivateOpen] = useState(false);
    const [processing, setProcessing] = useState(false);

    const canOperate = can('reception.operate');
    const canIncidents = can('reception.incidents');
    const canManage = can('rooms.manage');

    const current = room.current_reservation;
    const next = room.next_reservation;
    const canHost =
        room.active &&
        room.status !== 'mantenimiento' &&
        room.status !== 'limpieza';

    const incidentPreset: ReservationOption | null = current
        ? {
              id: current.id,
              room_id: current.room_id,
              client: current.client
                  ? {
                        first_name: current.client.first_name,
                        last_name: current.client.last_name,
                    }
                  : null,
          }
        : null;

    const refreshAfter = (close: () => void) => {
        close();
        onRefresh();
    };

    const confirmCheckOut = () => {
        if (current === null) {
            return;
        }

        router.post(
            `/reception/reservations/${current.id}/check-out`,
            {},
            {
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onSuccess: () => refreshAfter(() => setCheckOutOpen(false)),
                onFinish: () => setProcessing(false),
            },
        );
    };

    const confirmDeactivate = () => {
        router.delete(`/rooms/${room.id}`, {
            preserveScroll: true,
            onStart: () => setProcessing(true),
            onSuccess: () => refreshAfter(() => setDeactivateOpen(false)),
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <div className="space-y-2 border-b px-4 py-3">
            <div className="grid grid-cols-2 gap-2">
                {canOperate && next !== null && canHost && (
                    <Button
                        type="button"
                        size="sm"
                        onClick={() => setCheckInTarget(next)}
                    >
                        <LogIn className="size-4" />
                        Check-in
                    </Button>
                )}

                {canOperate && current !== null && (
                    <Button
                        type="button"
                        size="sm"
                        onClick={() => setCheckOutOpen(true)}
                    >
                        <LogOut className="size-4" />
                        Check-out
                    </Button>
                )}

                {canOperate && current !== null && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setChangeRoomTarget(current)}
                    >
                        <Repeat className="size-4" />
                        Cambiar habitación
                    </Button>
                )}

                {canOperate && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setStatusOpen(true)}
                    >
                        <RefreshCw className="size-4" />
                        Cambiar estado
                    </Button>
                )}

                {canIncidents && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIncidentOpen(true)}
                    >
                        <TriangleAlert className="size-4" />
                        Incidencia
                    </Button>
                )}

                {canManage && (
                    <Button type="button" variant="outline" size="sm" asChild>
                        <Link href={`/rooms/${room.id}/edit`}>
                            <Pencil className="size-4" />
                            Editar
                        </Link>
                    </Button>
                )}

                <Button type="button" variant="outline" size="sm" asChild>
                    <Link href={`/rooms/${room.id}`}>
                        <ExternalLink className="size-4" />
                        Ver ficha
                    </Link>
                </Button>

                {canManage && room.active && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeactivateOpen(true)}
                    >
                        <Trash2 className="size-4" />
                        Desactivar
                    </Button>
                )}
            </div>

            <CheckInDialog
                reservation={checkInTarget}
                rooms={options.roomsForAssignment}
                onClose={() => refreshAfter(() => setCheckInTarget(null))}
            />

            <ChangeRoomDialog
                reservation={changeRoomTarget}
                rooms={options.roomsForAssignment}
                onClose={() => refreshAfter(() => setChangeRoomTarget(null))}
            />

            <RoomStatusDialog
                room={statusOpen ? room : null}
                statuses={options.roomStatuses}
                onClose={() => refreshAfter(() => setStatusOpen(false))}
            />

            <IncidentDialog
                open={incidentOpen}
                rooms={options.roomsForIncidents}
                reservations={options.reservationsForIncidents}
                presetReservation={incidentPreset}
                types={options.incidentTypes}
                severities={options.incidentSeverities}
                onClose={() => refreshAfter(() => setIncidentOpen(false))}
            />

            <ConfirmDialog
                open={checkOutOpen}
                onOpenChange={setCheckOutOpen}
                title="Registrar check-out"
                description={
                    current
                        ? `Se cerrará la estancia de ${current.client ? `${current.client.first_name} ${current.client.last_name}` : `la reservación #${current.id}`} y la habitación pasará a limpieza.`
                        : undefined
                }
                confirmLabel="Registrar check-out"
                destructive={false}
                processing={processing}
                onConfirm={confirmCheckOut}
            />

            <ConfirmDialog
                open={deactivateOpen}
                onOpenChange={setDeactivateOpen}
                title="Desactivar habitación"
                description="La habitación dejará de mostrarse en recepción y no podrá asignarse. El historial se conserva."
                confirmLabel="Desactivar"
                processing={processing}
                onConfirm={confirmDeactivate}
            />

            {!canOperate && !canIncidents && !canManage && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <DoorOpen className="size-4" />
                    Tu rol solo puede consultar la ficha de la habitación.
                </p>
            )}
        </div>
    );
}
