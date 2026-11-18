import { Head, Link, router } from '@inertiajs/react';
import {
    CalendarDays,
    Eye,
    MoreHorizontal,
    Pencil,
    Plus,
    RefreshCw,
    Trash2,
} from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
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

interface Event {
    id: number;
    title: string;
    type: string;
    starts_at: string;
    ends_at?: string | null;
    active: boolean;
    room?: { id: number; name: string } | null;
    reservation?: {
        id: number;
        client?: { first_name: string; last_name: string } | null;
    } | null;
}

const typeVariant = (type: string) => {
    if (type === 'bloqueo') {
        return 'destructive' as const;
    }

    if (type === 'mantenimiento') {
        return 'outline' as const;
    }

    return 'secondary' as const;
};

const typeLabel = (type: string) =>
    type.charAt(0).toUpperCase() + type.slice(1);

export default function Index({ events }: { events: Event[] }) {
    const handleDelete = (id: number) => {
        if (confirm('¿Deseas eliminar este evento del calendario?')) {
            router.delete(`/calendars/${id}`);
        }
    };

    const handleRestore = (id: number) => {
        if (confirm('¿Deseas restaurar este evento?')) {
            router.patch(`/calendars/${id}/restore`);
        }
    };

    return (
        <>
            <Head title="Calendario" />

            <div className="space-y-6 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-foreground">
                            Calendario
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Organiza eventos, bloqueos y mantenimientos por
                            habitación.
                        </p>
                    </div>

                    <Button asChild className="w-full sm:w-auto">
                        <Link href="/calendars/create">
                            <Plus className="mr-2 h-4 w-4" />
                            Nuevo Evento
                        </Link>
                    </Button>
                </div>

                <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                    {events.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="w-[60px] text-center">
                                        #
                                    </TableHead>
                                    <TableHead>Título</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Habitación</TableHead>
                                    <TableHead>Reserva</TableHead>
                                    <TableHead>Inicio</TableHead>
                                    <TableHead className="text-center">
                                        Estado
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Acciones
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {events.map((event) => (
                                    <TableRow
                                        key={event.id}
                                        className="hover:bg-muted/30"
                                    >
                                        <TableCell className="text-center font-medium text-muted-foreground">
                                            {event.id}
                                        </TableCell>
                                        <TableCell className="font-semibold text-foreground">
                                            {event.title}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={typeVariant(
                                                    event.type,
                                                )}
                                            >
                                                {typeLabel(event.type)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {event.room?.name ?? '—'}
                                        </TableCell>
                                        <TableCell>
                                            {event.reservation ? (
                                                <Link
                                                    href={`/reservations/${event.reservation.id}`}
                                                    className="text-primary hover:underline"
                                                >
                                                    #{event.reservation.id}
                                                    {event.reservation.client
                                                        ? ` · ${event.reservation.client.first_name}`
                                                        : ''}
                                                </Link>
                                            ) : (
                                                '—'
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {formatDateTime(event.starts_at)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <StatusBadge
                                                status="Activo"
                                                active={event.active}
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
                                                            href={`/calendars/${event.id}/edit`}
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
                                                            href={`/calendars/${event.id}`}
                                                        >
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            Ver detalle
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    {event.active ? (
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                handleDelete(
                                                                    event.id,
                                                                )
                                                            }
                                                            className="cursor-pointer text-red-600 focus:text-red-600"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Eliminar
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                handleRestore(
                                                                    event.id,
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
                                <CalendarDays className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">
                                El calendario está vacío
                            </h3>
                            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                                Agrega un evento o un bloqueo para una de tus
                                habitaciones.
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
            title: 'Calendario',
            href: '/calendars',
        },
    ],
};
