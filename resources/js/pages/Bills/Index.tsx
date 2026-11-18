import { Head, Link, router } from '@inertiajs/react';
import {
    Eye,
    MoreHorizontal,
    Pencil,
    Plus,
    Receipt,
    RefreshCw,
    Trash2,
} from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/format';

interface Bill {
    id: number;
    number: string;
    issued_at?: string | null;
    total: string | number;
    status: string;
    active: boolean;
    client?: { id: number; first_name: string; last_name: string } | null;
    reservation?: { id: number } | null;
}

export default function Index({ bills }: { bills: Bill[] }) {
    const handleDelete = (id: number) => {
        if (confirm('¿Deseas anular esta factura?')) {
            router.delete(`/bills/${id}`);
        }
    };

    const handleRestore = (id: number) => {
        if (confirm('¿Deseas restaurar esta factura?')) {
            router.patch(`/bills/${id}/restore`);
        }
    };

    return (
        <>
            <Head title="Facturas" />

            <div className="space-y-6 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-foreground">
                            Facturas
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Consulta las facturas emitidas y su estado de pago.
                        </p>
                    </div>

                    <Button asChild className="w-full sm:w-auto">
                        <Link href="/bills/create">
                            <Plus className="mr-2 h-4 w-4" />
                            Nueva Factura
                        </Link>
                    </Button>
                </div>

                <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                    {bills.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead>Número</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Reserva</TableHead>
                                    <TableHead>Emitida</TableHead>
                                    <TableHead className="text-right">
                                        Total
                                    </TableHead>
                                    <TableHead className="text-center">
                                        Estado
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Acciones
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {bills.map((bill) => (
                                    <TableRow
                                        key={bill.id}
                                        className="hover:bg-muted/30"
                                    >
                                        <TableCell className="font-mono font-semibold text-foreground">
                                            {bill.number}
                                        </TableCell>
                                        <TableCell>
                                            {bill.client
                                                ? `${bill.client.first_name} ${bill.client.last_name}`
                                                : '—'}
                                        </TableCell>
                                        <TableCell>
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
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {formatDate(bill.issued_at)}
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">
                                            {formatCurrency(bill.total)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <StatusBadge
                                                status={bill.status}
                                                active={bill.active}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <span className="sr-only">
                                                            Abrir menú
                                                        </span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>
                                                        Opciones
                                                    </DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        asChild
                                                        className="cursor-pointer"
                                                    >
                                                        <Link
                                                            href={`/bills/${bill.id}/edit`}
                                                        >
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            Editar
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        asChild
                                                        className="cursor-pointer"
                                                    >
                                                        <Link
                                                            href={`/bills/${bill.id}`}
                                                        >
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            Ver detalle
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    {bill.active ? (
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                handleDelete(
                                                                    bill.id,
                                                                )
                                                            }
                                                            className="cursor-pointer text-red-600 focus:text-red-600"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Anular
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                handleRestore(
                                                                    bill.id,
                                                                )
                                                            }
                                                            className="cursor-pointer text-emerald-600 focus:text-emerald-600"
                                                        >
                                                            <RefreshCw className="mr-2 h-4 w-4" />
                                                            Restaurar
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                <Receipt className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">
                                No hay facturas registradas
                            </h3>
                            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                                Emite una factura desde una reserva o crea una
                                nueva desde el botón de arriba.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        {
            title: 'Facturas',
            href: '/bills',
        },
    ],
};
