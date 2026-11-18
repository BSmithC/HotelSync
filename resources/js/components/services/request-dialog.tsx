import { useForm } from '@inertiajs/react';
import { ConciergeBell } from 'lucide-react';
import { useState } from 'react';
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
import { formatCurrency } from '@/lib/format';
import { createIdempotencyKey } from '@/lib/idempotency';
import { serviceCategoryLabels } from '@/lib/service-labels';
import { store as storeRequest } from '@/routes/services/requests';
import type {
    ServiceClient,
    ServiceOption,
    ServiceReservationOption,
} from '@/types';

function clientName(client?: ServiceClient | null): string {
    if (!client) {
        return 'Cliente';
    }

    return `${client.first_name} ${client.last_name}`.trim();
}

/**
 * Register a request for a hotel service. The guest can be tied to an
 * in-house reservation; the server derives the client from it.
 */
export function RequestDialog({
    services,
    clients,
    reservations,
    currency,
    defaultDate,
    onClose,
}: {
    services: ServiceOption[];
    clients: ServiceClient[];
    reservations: ServiceReservationOption[];
    currency: string;
    defaultDate: string;
    onClose: () => void;
}) {
    const [key] = useState(() => createIdempotencyKey());
    const initialService = services[0] ?? null;

    const { data, setData, post, processing, errors, transform } = useForm({
        service_id: initialService ? String(initialService.id) : '',
        client_id: '',
        reservation_id: 'none',
        quantity: '1',
        unit_price: initialService ? String(initialService.price) : '',
        requested_at: defaultDate,
        notes: '',
        idempotency_key: key,
    });

    const selectedReservation = reservations.find(
        (reservation) => String(reservation.id) === data.reservation_id,
    );

    const filteredReservations = data.client_id
        ? reservations.filter(
              (reservation) =>
                  reservation.id === selectedReservation?.id ||
                  String(reservation.client_id ?? '') === data.client_id,
          )
        : reservations;

    const total =
        Math.max(0, Number(data.quantity || 0)) *
        Math.max(0, Number(data.unit_price || 0));

    const handleService = (value: string) => {
        const service = services.find((entry) => String(entry.id) === value);

        setData((current) => ({
            ...current,
            service_id: value,
            unit_price: service ? String(service.price) : current.unit_price,
        }));
    };

    const handleReservation = (value: string) => {
        const reservation = reservations.find(
            (entry) => String(entry.id) === value,
        );

        setData((current) => ({
            ...current,
            reservation_id: value,
            client_id:
                value !== 'none' && reservation?.client_id
                    ? String(reservation.client_id)
                    : current.client_id,
        }));
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (data.service_id === '' || data.client_id === '') {
            return;
        }

        post(storeRequest.url(), {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    transform((current) => ({
        ...current,
        reservation_id:
            current.reservation_id === 'none' ? null : current.reservation_id,
        unit_price: current.unit_price === '' ? null : current.unit_price,
    }));

    const submitDisabled =
        processing ||
        data.service_id === '' ||
        data.client_id === '' ||
        Number(data.quantity || 0) < 1;

    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
        >
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ConciergeBell className="size-4 text-primary" />
                        Nueva solicitud de servicio
                    </DialogTitle>
                    <DialogDescription>
                        Registra el servicio para un huésped. El total se
                        calcula en el servidor con la cantidad y el precio.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="request-service">Servicio</Label>
                        <Select
                            value={data.service_id}
                            onValueChange={handleService}
                        >
                            <SelectTrigger id="request-service">
                                <SelectValue placeholder="Selecciona un servicio" />
                            </SelectTrigger>
                            <SelectContent>
                                {services.map((service) => (
                                    <SelectItem
                                        key={service.id}
                                        value={String(service.id)}
                                    >
                                        {service.name} ·{' '}
                                        {serviceCategoryLabels[
                                            service.category
                                        ] ?? service.category}{' '}
                                        ·{' '}
                                        {formatCurrency(
                                            service.price,
                                            currency,
                                        )}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {services.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                                Primero crea un servicio en el catálogo.
                            </p>
                        )}
                        {errors.service_id && (
                            <p className="text-sm text-destructive">
                                {errors.service_id}
                            </p>
                        )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="request-reservation">
                                Reserva (opcional)
                            </Label>
                            <Select
                                value={data.reservation_id}
                                onValueChange={handleReservation}
                            >
                                <SelectTrigger id="request-reservation">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">
                                        Sin reserva
                                    </SelectItem>
                                    {filteredReservations.map((reservation) => (
                                        <SelectItem
                                            key={reservation.id}
                                            value={String(reservation.id)}
                                        >
                                            #{reservation.id} ·{' '}
                                            {clientName(reservation.client)}
                                            {reservation.room
                                                ? ` · Hab. ${reservation.room.name}`
                                                : ''}
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

                        <div className="space-y-2">
                            <Label htmlFor="request-client">Cliente</Label>
                            <Select
                                value={data.client_id}
                                onValueChange={(value) =>
                                    setData('client_id', value)
                                }
                            >
                                <SelectTrigger id="request-client">
                                    <SelectValue placeholder="Selecciona el huésped" />
                                </SelectTrigger>
                                <SelectContent>
                                    {clients.map((client) => (
                                        <SelectItem
                                            key={client.id}
                                            value={String(client.id)}
                                        >
                                            {clientName(client)}
                                            {client.cedula
                                                ? ` · ${client.cedula}`
                                                : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {selectedReservation?.client && (
                                <p className="text-xs text-muted-foreground">
                                    La reserva pertenece a{' '}
                                    {clientName(selectedReservation.client)}.
                                </p>
                            )}
                            {errors.client_id && (
                                <p className="text-sm text-destructive">
                                    {errors.client_id}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="request-quantity">Cantidad</Label>
                            <Input
                                id="request-quantity"
                                type="number"
                                min="1"
                                step="1"
                                value={data.quantity}
                                onChange={(event) =>
                                    setData('quantity', event.target.value)
                                }
                            />
                            {errors.quantity && (
                                <p className="text-sm text-destructive">
                                    {errors.quantity}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="request-price">
                                Precio unitario
                            </Label>
                            <Input
                                id="request-price"
                                type="number"
                                min="0"
                                step="0.01"
                                value={data.unit_price}
                                onChange={(event) =>
                                    setData('unit_price', event.target.value)
                                }
                            />
                            {errors.unit_price && (
                                <p className="text-sm text-destructive">
                                    {errors.unit_price}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="request-date">Fecha</Label>
                            <Input
                                id="request-date"
                                type="date"
                                value={data.requested_at}
                                onChange={(event) =>
                                    setData('requested_at', event.target.value)
                                }
                            />
                            {errors.requested_at && (
                                <p className="text-sm text-destructive">
                                    {errors.requested_at}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="request-notes">Notas</Label>
                        <Textarea
                            id="request-notes"
                            value={data.notes}
                            onChange={(event) =>
                                setData('notes', event.target.value)
                            }
                            rows={2}
                            placeholder="Indicaciones especiales, horario…"
                        />
                        {errors.notes && (
                            <p className="text-sm text-destructive">
                                {errors.notes}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                        <span className="text-muted-foreground">
                            Total estimado
                        </span>
                        <strong>{formatCurrency(total, currency)}</strong>
                    </div>

                    {errors.idempotency_key && (
                        <p className="text-sm text-destructive">
                            {errors.idempotency_key}
                        </p>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={processing}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={submitDisabled}>
                            {processing
                                ? 'Registrando…'
                                : 'Registrar solicitud'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
