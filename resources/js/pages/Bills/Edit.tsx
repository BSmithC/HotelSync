import { Head, useForm, Link } from '@inertiajs/react';
import React from 'react';
import { Button } from '@/components/ui/button';
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
import { formatCurrency, formatDateTime, toDateInput } from '@/lib/format';

interface ClientOption {
    id: number;
    first_name: string;
    last_name: string;
}

interface ReservationOption {
    id: number;
    client_id: number;
    reserved_at: string;
    client?: { first_name: string; last_name: string } | null;
}

interface Bill {
    id: number;
    client_id: number;
    reservation_id?: number | null;
    number: string;
    issued_at?: string | null;
    subtotal: string | number;
    tax: string | number;
    status: string;
    notes?: string | null;
}

const statuses = ['Pendiente', 'Pagada', 'Anulada'];

export default function Edit({
    bill,
    clients,
    reservations,
}: {
    bill: Bill;
    clients: ClientOption[];
    reservations: ReservationOption[];
}) {
    const { data, setData, put, processing, errors, transform } = useForm({
        client_id: String(bill.client_id),
        reservation_id: bill.reservation_id
            ? String(bill.reservation_id)
            : 'none',
        number: bill.number,
        issued_at: toDateInput(bill.issued_at),
        subtotal: String(bill.subtotal),
        tax: String(bill.tax),
        status: bill.status,
        notes: bill.notes ?? '',
    });

    const total = (Number(data.subtotal) || 0) + (Number(data.tax) || 0);

    const handleReservationChange = (value: string) => {
        setData('reservation_id', value);

        if (value === 'none') {
            return;
        }

        const reservation = reservations.find(
            (item) => String(item.id) === value,
        );

        if (reservation) {
            setData('client_id', String(reservation.client_id));
        }
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        transform((previous) => ({
            ...previous,
            reservation_id:
                previous.reservation_id === 'none'
                    ? null
                    : previous.reservation_id,
        }));

        put(`/bills/${bill.id}`);
    };

    return (
        <>
            <Head title={`Editar factura ${bill.number}`} />

            <div className="flex min-h-[40vh] items-center justify-center p-4">
                <div className="w-full max-w-2xl rounded-xl border bg-card p-6 shadow-sm">
                    <h2 className="mb-1 text-xl font-bold text-foreground">
                        Editar Factura
                    </h2>
                    <p className="mb-6 text-sm text-muted-foreground">
                        {bill.number}
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="client_id">
                                    Cliente{' '}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={data.client_id}
                                    onValueChange={(value) =>
                                        setData('client_id', value)
                                    }
                                >
                                    <SelectTrigger id="client_id">
                                        <SelectValue placeholder="Selecciona un cliente" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clients.map((client) => (
                                            <SelectItem
                                                key={client.id}
                                                value={String(client.id)}
                                            >
                                                {client.first_name}{' '}
                                                {client.last_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.client_id && (
                                    <p className="text-sm text-red-500">
                                        {errors.client_id}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="reservation_id">
                                    Reserva asociada
                                </Label>
                                <Select
                                    value={data.reservation_id}
                                    onValueChange={handleReservationChange}
                                >
                                    <SelectTrigger id="reservation_id">
                                        <SelectValue placeholder="Sin reserva" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">
                                            Sin reserva
                                        </SelectItem>
                                        {reservations.map((reservation) => (
                                            <SelectItem
                                                key={reservation.id}
                                                value={String(reservation.id)}
                                            >
                                                #{reservation.id}
                                                {reservation.client
                                                    ? ` · ${reservation.client.first_name} ${reservation.client.last_name}`
                                                    : ''}
                                                {' · '}
                                                {formatDateTime(
                                                    reservation.reserved_at,
                                                )}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.reservation_id && (
                                    <p className="text-sm text-red-500">
                                        {errors.reservation_id}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="number">
                                    Número{' '}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="number"
                                    placeholder="FAC-0001"
                                    value={data.number}
                                    onChange={(event) =>
                                        setData('number', event.target.value)
                                    }
                                />
                                {errors.number && (
                                    <p className="text-sm text-red-500">
                                        {errors.number}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="issued_at">
                                    Fecha de emisión{' '}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="issued_at"
                                    type="date"
                                    value={data.issued_at}
                                    onChange={(event) =>
                                        setData('issued_at', event.target.value)
                                    }
                                />
                                {errors.issued_at && (
                                    <p className="text-sm text-red-500">
                                        {errors.issued_at}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="subtotal">
                                    Subtotal{' '}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="subtotal"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={data.subtotal}
                                    onChange={(event) =>
                                        setData('subtotal', event.target.value)
                                    }
                                />
                                {errors.subtotal && (
                                    <p className="text-sm text-red-500">
                                        {errors.subtotal}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="tax">Impuesto</Label>
                                <Input
                                    id="tax"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={data.tax}
                                    onChange={(event) =>
                                        setData('tax', event.target.value)
                                    }
                                />
                                {errors.tax && (
                                    <p className="text-sm text-red-500">
                                        {errors.tax}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status">
                                    Estado{' '}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={data.status}
                                    onValueChange={(value) =>
                                        setData('status', value)
                                    }
                                >
                                    <SelectTrigger id="status">
                                        <SelectValue placeholder="Selecciona un estado" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statuses.map((status) => (
                                            <SelectItem
                                                key={status}
                                                value={status}
                                            >
                                                {status}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.status && (
                                    <p className="text-sm text-red-500">
                                        {errors.status}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-end">
                                <div className="w-full rounded-lg border bg-muted/40 px-4 py-3">
                                    <p className="text-xs text-muted-foreground">
                                        Total
                                    </p>
                                    <p className="text-lg font-semibold">
                                        {formatCurrency(total)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Notas</Label>
                            <Textarea
                                id="notes"
                                placeholder="Observaciones de la factura"
                                value={data.notes}
                                onChange={(event) =>
                                    setData('notes', event.target.value)
                                }
                            />
                            {errors.notes && (
                                <p className="text-sm text-red-500">
                                    {errors.notes}
                                </p>
                            )}
                        </div>

                        <div className="flex justify-end gap-4 pt-2">
                            <Button
                                variant="outline"
                                asChild
                                className="w-full sm:w-auto"
                            >
                                <Link href="/bills">Cancelar</Link>
                            </Button>

                            <Button
                                type="submit"
                                disabled={processing}
                                className="w-full sm:w-auto"
                            >
                                {processing ? 'Guardando...' : 'Guardar'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}

Edit.layout = {
    breadcrumbs: [
        {
            title: 'Facturas',
            href: '/bills',
        },
        {
            title: 'Editar',
            href: '/bills',
        },
    ],
};
