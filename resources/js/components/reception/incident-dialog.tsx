import { useForm } from '@inertiajs/react';
import { AlertTriangle } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { store as storeIncident } from '@/routes/reception/incidents';
import type { ReservationOption, RoomOption } from '@/types';

const typeLabels: Record<string, string> = {
    mantenimiento: 'Mantenimiento',
    limpieza: 'Limpieza',
    huesped: 'Huésped',
    seguridad: 'Seguridad',
    otro: 'Otro',
};

const severityLabels: Record<string, string> = {
    baja: 'Baja',
    media: 'Media',
    alta: 'Alta',
};

/**
 * Registers an operational incident linked to a room and/or reservation.
 */
export function IncidentDialog({
    open,
    rooms,
    reservations,
    presetReservation,
    types,
    severities,
    onClose,
}: {
    open: boolean;
    rooms: RoomOption[];
    reservations: ReservationOption[];
    presetReservation: ReservationOption | null;
    types: string[];
    severities: string[];
    onClose: () => void;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        reservation_id: '',
        room_id: '',
        type: 'mantenimiento',
        severity: 'media',
        title: '',
        description: '',
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        setData({
            reservation_id: presetReservation
                ? String(presetReservation.id)
                : '',
            room_id: presetReservation?.room_id
                ? String(presetReservation.room_id)
                : '',
            type: 'mantenimiento',
            severity: 'media',
            title: '',
            description: '',
        });
    }, [open, presetReservation, setData]);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        post(storeIncident().url, {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
        >
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="size-4 text-warning" />
                        Nueva incidencia
                    </DialogTitle>
                    <DialogDescription>
                        Registra el problema para darle seguimiento desde
                        recepción.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="incident-type">Tipo</Label>
                            <Select
                                value={data.type}
                                onValueChange={(value) =>
                                    setData('type', value)
                                }
                            >
                                <SelectTrigger id="incident-type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {types.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {typeLabels[type] ?? type}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.type && (
                                <p className="text-sm text-destructive">
                                    {errors.type}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="incident-severity">Severidad</Label>
                            <Select
                                value={data.severity}
                                onValueChange={(value) =>
                                    setData('severity', value)
                                }
                            >
                                <SelectTrigger id="incident-severity">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {severities.map((severity) => (
                                        <SelectItem
                                            key={severity}
                                            value={severity}
                                        >
                                            {severityLabels[severity] ??
                                                severity}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.severity && (
                                <p className="text-sm text-destructive">
                                    {errors.severity}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="incident-room">Habitación</Label>
                            <Select
                                value={data.room_id}
                                onValueChange={(value) =>
                                    setData('room_id', value)
                                }
                            >
                                <SelectTrigger id="incident-room">
                                    <SelectValue placeholder="Sin habitación" />
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
                                <p className="text-sm text-destructive">
                                    {errors.room_id}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="incident-reservation">
                                Reservación
                            </Label>
                            <Select
                                value={data.reservation_id}
                                onValueChange={(value) => {
                                    setData('reservation_id', value);

                                    const reservation = reservations.find(
                                        (item) => String(item.id) === value,
                                    );

                                    if (reservation?.room_id) {
                                        setData(
                                            'room_id',
                                            String(reservation.room_id),
                                        );
                                    }
                                }}
                            >
                                <SelectTrigger id="incident-reservation">
                                    <SelectValue placeholder="Sin reservación" />
                                </SelectTrigger>
                                <SelectContent>
                                    {reservations.map((reservation) => (
                                        <SelectItem
                                            key={reservation.id}
                                            value={String(reservation.id)}
                                        >
                                            #{reservation.id} ·{' '}
                                            {reservation.client
                                                ? `${reservation.client.first_name} ${reservation.client.last_name}`
                                                : 'Sin huésped'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.reservation_id && (
                                <p className="text-sm text-destructive">
                                    {errors.reservation_id}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="incident-title">Título</Label>
                        <Input
                            id="incident-title"
                            value={data.title}
                            onChange={(event) =>
                                setData('title', event.target.value)
                            }
                            placeholder="Ej. Aire acondicionado sin funcionar"
                        />
                        {errors.title && (
                            <p className="text-sm text-destructive">
                                {errors.title}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="incident-description">
                            Descripción
                        </Label>
                        <Textarea
                            id="incident-description"
                            value={data.description}
                            onChange={(event) =>
                                setData('description', event.target.value)
                            }
                            placeholder="Describe qué ocurrió y qué áreas están afectadas."
                            rows={3}
                        />
                        {errors.description && (
                            <p className="text-sm text-destructive">
                                {errors.description}
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
                        <Button type="submit" disabled={processing}>
                            {processing
                                ? 'Guardando...'
                                : 'Registrar incidencia'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
