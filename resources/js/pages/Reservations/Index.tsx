import { Head, Link, router } from '@inertiajs/react';
import {
    CalendarCheck,
    Eye,
    MoreHorizontal,
    Pencil,
    Plus,
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
import { formatDateTime } from '@/lib/format';

interface Reservation {
    id: number;
    reserved_at: string;
    finished_at?: string | null;
    guests: number;
    status: string;
    active: boolean;
    client?: { id: number; first_name: string; last_name: string } | null;
    room?: { id: number; name: string } | null;
}

export default function Index({
    reservations,
}: {
    reservations: Reservation[];
}) {
    const handleDelete = (id: number) => {
        if (confirm('¿Deseas cancelar esta reservación?')) {
            router.delete(`/reservations/${id}`);
        }
    };

    const handleRestore = (id: number) => {
        if (confirm('¿Deseas restaurar esta reservación?')) {
            router.patch(`/reservations/${id}/restore`);
        }
    };

    return (
        <>
            <Head title="Reservaciones" />

            <div className="space-y-6 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-foreground">
                            Reservaciones
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Controla las entradas, salidas y el estado de cada
                            reserva.
                        </p>
                    </div>

                    <Button asChild className="w-full sm:w-auto">
                        <Link href="/reservations/create">
                            <Plus className="mr-2 h-4 w-4" />
                            Nueva Reservación
                        </Link>
                    </Button>
                </div>

                <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                    {reservations.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="w-[60px] text-center">
                                        #
                                    </TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Habitación</TableHead>
                                    <TableHead>Entrada</TableHead>
                                    <TableHead className="text-center">
                                        Huéspedes
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
                                {reservations.map((reservation) => (
                                    <TableRow
                                        key={reservation.id}
                                        className="hover:bg-muted/30"
                                    >
                                        <TableCell className="text-center font-medium text-muted-foreground">
                                            {reservation.id}
                                        </TableCell>
                                        <TableCell className="font-semibold text-foreground">
                                            {reservation.client
                                                ? `${reservation.client.first_name} ${reservation.client.last_name}`
                                                : '—'}
                                        </TableCell>
                                        <TableCell>
                                            {reservation.room?.name ?? '—'}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {formatDateTime(
                                                reservation.reserved_at,
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {reservation.guests}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <StatusBadge
                                                status={reservation.status}
                                                active={reservation.active}
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
                                                            href={`/reservations/${reservation.id}/edit`}
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
                                                            href={`/reservations/${reservation.id}`}
                                                        >
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            Ver detalle
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    {reservation.active ? (
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                handleDelete(
                                                                    reservation.id,
                                                                )
                                                            }
                                                            className="cursor-pointer text-red-600 focus:text-red-600"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Cancelar
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                handleRestore(
                                                                    reservation.id,
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
                                <CalendarCheck className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">
                                No hay reservaciones registradas
                            </h3>
                            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                                Registra la primera reserva de un cliente en una
                                de tus habitaciones.
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
            title: 'Reservaciones',
            href: '/reservations',
        },
    ],
};
