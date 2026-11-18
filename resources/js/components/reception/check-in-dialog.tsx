import { useForm } from '@inertiajs/react';
import { BedDouble, LogIn } from 'lucide-react';
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
import { checkIn } from '@/routes/reception';
import type { ReceptionReservation, RoomOption } from '@/types';

function guestName(reservation: ReceptionReservation): string {
    if (!reservation.client) {
        return `Reservación #${reservation.id}`;
    }

    return `${reservation.client.first_name} ${reservation.client.last_name}`;
}

/**
 * Confirms the arrival and lets reception choose the final room.
 */
export function CheckInDialog({
    reservation,
    rooms,
    onClose,
}: {
    reservation: ReceptionReservation | null;
    rooms: RoomOption[];
    onClose: () => void;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        reservation: '',
        room_id: '',
    });

    useEffect(() => {
        if (reservation === null) {
            return;
        }

        const currentRoom = reservation.room_id
            ? rooms.find((room) => room.id === reservation.room_id)
            : undefined;

        setData('room_id', currentRoom ? String(currentRoom.id) : '');

        return () => reset();
    }, [reservation, rooms, setData, reset]);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (reservation === null) {
            return;
        }

        post(checkIn(reservation.id).url, {
            preserveScroll: true,
            onSuccess: () => onClose(),
        });
    };

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
                        <LogIn className="size-4 text-primary" />
                        Registrar check-in
                    </DialogTitle>
                    <DialogDescription>
                        {reservation
                            ? `${guestName(reservation)} · ${reservation.guests} huésped(es).`
                            : undefined}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <BedDouble className="size-4" />
                            Habitación reservada
                        </div>
                        <p className="mt-1 font-medium text-foreground">
                            {reservation?.room?.name ??
                                'Sin habitación asignada'}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="check-in-room">Habitación final</Label>
                        <Select
                            value={data.room_id}
                            onValueChange={(value) => setData('room_id', value)}
                        >
                            <SelectTrigger id="check-in-room">
                                <SelectValue placeholder="Selecciona una habitación" />
                            </SelectTrigger>
                            <SelectContent>
                                {rooms.map((room) => (
                                    <SelectItem
                                        key={room.id}
                                        value={String(room.id)}
                                    >
                                        {room.name} · {room.status}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {rooms.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                                No hay habitaciones disponibles. Libera una
                                habitación o ajusta su estado antes de
                                continuar.
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
                            {processing
                                ? 'Registrando...'
                                : 'Confirmar check-in'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
