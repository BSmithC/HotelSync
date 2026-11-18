import { useForm } from '@inertiajs/react';
import { DoorOpen } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { status as updateRoomStatus } from '@/routes/reception/rooms';
import type { ReceptionRoom } from '@/types';

const statusLabels: Record<string, string> = {
    disponible: 'Disponible',
    ocupada: 'Ocupada',
    reservada: 'Reservada',
    mantenimiento: 'Mantenimiento',
};

/**
 * Manual room state change with the required operational reason.
 */
export function RoomStatusDialog({
    room,
    statuses,
    onClose,
}: {
    room: ReceptionRoom | null;
    statuses: string[];
    onClose: () => void;
}) {
    const { data, setData, patch, processing, errors, reset } = useForm({
        status: '',
        reason: '',
    });

    useEffect(() => {
        if (room !== null) {
            setData({ status: room.status, reason: '' });
        }

        return () => reset();
    }, [room, setData, reset]);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (room === null) {
            return;
        }

        patch(updateRoomStatus(room.id).url, {
            preserveScroll: true,
            onSuccess: () => onClose(),
        });
    };

    return (
        <Dialog
            open={room !== null}
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <DoorOpen className="size-4 text-primary" />
                        Estado de la habitación
                    </DialogTitle>
                    <DialogDescription>
                        {room
                            ? `${room.name} · estado actual: ${statusLabels[room.status] ?? room.status}.`
                            : undefined}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="room-status">Nuevo estado</Label>
                        <Select
                            value={data.status}
                            onValueChange={(value) => setData('status', value)}
                        >
                            <SelectTrigger id="room-status">
                                <SelectValue placeholder="Selecciona un estado" />
                            </SelectTrigger>
                            <SelectContent>
                                {statuses.map((status) => (
                                    <SelectItem key={status} value={status}>
                                        {statusLabels[status] ?? status}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.status && (
                            <p className="text-sm text-destructive">
                                {errors.status}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="room-status-reason">Motivo</Label>
                        <Input
                            id="room-status-reason"
                            value={data.reason}
                            onChange={(event) =>
                                setData('reason', event.target.value)
                            }
                            placeholder="Ej. Limpieza profunda, reparación..."
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
                            disabled={processing || data.status === ''}
                        >
                            {processing ? 'Guardando...' : 'Guardar estado'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
