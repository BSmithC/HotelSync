import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Pencil } from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/format';

interface BillDetail {
    id: number;
    description: string;
    quantity: number;
    unit_price: string | number;
    subtotal: string | number;
}

interface Bill {
    id: number;
    number: string;
    issued_at?: string | null;
    subtotal: string | number;
    tax: string | number;
    total: string | number;
    status: string;
    active: boolean;
    notes?: string | null;
    client?: { id: number; first_name: string; last_name: string } | null;
    reservation?: { id: number } | null;
    details?: BillDetail[];
}

export default function Show({ bill }: { bill: Bill }) {
    const details = bill.details ?? [];

    return (
        <>
            <Head title={`Factura ${bill.number}`} />

            <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
                <Card>
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div>
                            <CardTitle>{bill.number}</CardTitle>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Factura #{bill.id}
                            </p>
                        </div>
                        <StatusBadge
                            status={bill.status}
                            active={bill.active}
                        />
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                            <div>
                                <dt className="text-muted-foreground">
                                    Cliente
                                </dt>
                                <dd className="font-medium">
                                    {bill.client ? (
                                        <Link
                                            href={`/clients/${bill.client.id}`}
                                            className="text-primary hover:underline"
                                        >
                                            {bill.client.first_name}{' '}
                                            {bill.client.last_name}
                                        </Link>
                                    ) : (
                                        '—'
                                    )}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">
                                    Reserva
                                </dt>
                                <dd className="font-medium">
                                    {bill.reservation ? (
                                        <Link
                                            href={`/reservations/${bill.reservation.id}`}
                                            className="text-primary hover:underline"
                                        >
                                            #{bill.reservation.id}
                                        </Link>
                                    ) : (
                                        '—'
                                    )}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">
                                    Emitida
                                </dt>
                                <dd className="font-medium">
                                    {formatDate(bill.issued_at)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">Total</dt>
                                <dd className="text-lg font-semibold">
                                    {formatCurrency(bill.total)}
                                </dd>
                            </div>
                            <div className="sm:col-span-2">
                                <dt className="text-muted-foreground">Notas</dt>
                                <dd className="font-medium">
                                    {bill.notes || '—'}
                                </dd>
                            </div>
                        </dl>

                        {details.length > 0 && (
                            <div className="overflow-hidden rounded-lg border">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead>Descripción</TableHead>
                                            <TableHead className="text-center">
                                                Cantidad
                                            </TableHead>
                                            <TableHead className="text-right">
                                                Precio
                                            </TableHead>
                                            <TableHead className="text-right">
                                                Subtotal
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {details.map((detail) => (
                                            <TableRow key={detail.id}>
                                                <TableCell>
                                                    {detail.description}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {detail.quantity}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {formatCurrency(
                                                        detail.unit_price,
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {formatCurrency(
                                                        detail.subtotal,
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        <div className="ml-auto w-full max-w-xs space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                    Subtotal
                                </span>
                                <span>{formatCurrency(bill.subtotal)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                    Impuesto
                                </span>
                                <span>{formatCurrency(bill.tax)}</span>
                            </div>
                            <div className="flex justify-between border-t pt-1 text-base font-semibold">
                                <span>Total</span>
                                <span>{formatCurrency(bill.total)}</span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" asChild>
                                <Link href="/bills">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Volver
                                </Link>
                            </Button>
                            <Button asChild>
                                <Link href={`/bills/${bill.id}/edit`}>
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
            title: 'Facturas',
            href: '/bills',
        },
        {
            title: 'Detalle',
            href: '/bills',
        },
    ],
};
