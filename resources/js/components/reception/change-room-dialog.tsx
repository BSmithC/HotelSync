import { useForm } from '@inertiajs/react';
import { ArrowLeftRight } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { room as changeRoomRoute } from '@/routes/reception';
import type { ReceptionReservation, RoomOption } from '@/types';

function guestName(reservation: ReceptionReservation): string {
    if (!reservation.client) {
        return `Reservación #${reservation.id}`;
    }

    return `${reservation.client.first_name} ${reservation.client.last_name}`;
}

/**
 * Moves an in-house guest to a free room without closing the stay.
 */
export function ChangeRoomDialog({
    reservation,
    rooms,
    onClose,
}: {
    reservation: ReceptionReservation | null;
    rooms: RoomOption[];
    onClose: () => void;
}) {
    const { data, setData, patch, processing, errors, reset } = useForm({
        reservation: '',
        room_id: '',
        reason: '',
    });

    useEffect(() => {
        if (reservation !== null) {
            setData({ reservation: '', room_id: '', reason: '' });
        }

        return () => reset();
    }, [reservation, setData, reset]);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (reservation === null) {
            return;
        }

        patch(changeRoomRoute(reservation.id).url, {
            preserveScroll: true,
            onSuccess: () => onClose(),
        });
    };

    const available = rooms.filter((room) => room.id !== reservation?.room_id);

    return (
        <Dialog
            open={reservation !== null}
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ArrowLeftRight className="size-4 text-primary" />
                        Cambiar habitación
                    </DialogTitle>
                    <DialogDescription>
                        {reservation
                            ? `${guestName(reservation)} · actualmente en ${reservation.room?.name ?? 'sin habitación'}.`
                            : undefined}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="change-room">Habitación destino</Label>
                        <Select
                            value={data.room_id}
                            onValueChange={(value) => setData('room_id', value)}
                        >
                            <SelectTrigger id="change-room">
                                <SelectValue placeholder="Selecciona una habitación disponible" />
                            </SelectTrigger>
                            <SelectContent>
                                {available.map((room) => (
                                    <SelectItem
                                        key={room.id}
                                        value={String(room.id)}
                                    >
                                        {room.name} · {room.status}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {available.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                                No hay otra habitación disponible en este
                                momento.
                            </p>
                        )}
                        {errors.room_id && (
                            <p className="text-sm text-destructive">
                                {errors.room_id}
                            </p>
                        )}
                        {errors.reservation && (
                            <p className="text-sm text-destructive">
                                {errors.reservation}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="change-room-reason">Motivo</Label>
                        <Textarea
                            id="change-room-reason"
                            value={data.reason}
                            onChange={(event) =>
                                setData('reason', event.target.value)
                            }
                            placeholder="Ej. Solicitud del huésped, avería en la habitación..."
                            rows={3}
                        />
                        {errors.reason && (
                            <p className="text-sm text-destructive">
                                {errors.reason}
                            </p>
                        )}
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
                        <Button
                            type="submit"
                            disabled={processing || data.room_id === ''}
                        >
                            {processing ? 'Moviendo...' : 'Cambiar habitación'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
