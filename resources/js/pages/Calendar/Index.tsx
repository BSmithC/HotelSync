import { Head, Link } from '@inertiajs/react';
import {
    CalendarDays,
    Eye,
    Pencil,
    Plus,
    RefreshCw,
    Trash2,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table';
import type { DataTableColumn } from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { ListFilters } from '@/components/list-filters';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { RowActions } from '@/components/row-actions';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRecordAction } from '@/hooks/use-record-action';
import { formatDateTime } from '@/lib/format';
import {
    create as createEvent,
    destroy as destroyEvent,
    edit as editEvent,
    index as calendarsIndex,
    restore as restoreEvent,
    show as showEvent,
} from '@/routes/calendars';
import { show as showReservation } from '@/routes/reservations';
import type { ListFiltersState, Paginated } from '@/types';

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

const typeOptions = [
    { value: 'evento', label: 'Evento' },
    { value: 'bloqueo', label: 'Bloqueo' },
    { value: 'mantenimiento', label: 'Mantenimiento' },
];

const statusOptions = [
    { value: '1', label: 'Activos' },
    { value: '0', label: 'Inactivos' },
];

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

export default function Index({
    events,
    filters,
}: {
    events: Paginated<Event>;
    filters: ListFiltersState;
}) {
    const recordAction = useRecordAction({
        destroy: destroyEvent,
        restore: restoreEvent,
    });

    const hasFilters = Boolean(
        filters.search || filters.type || filters.status,
    );

    const columns: DataTableColumn<Event>[] = [
        {
            id: 'title',
            header: 'Título',
            cell: (event) => (
                <Link
                    href={showEvent(event.id)}
                    className="font-medium text-foreground transition-colors hover:text-primary"
                >
                    {event.title}
                </Link>
            ),
        },
        {
            id: 'type',
            header: 'Tipo',
            cell: (event) => (
                <Badge variant={typeVariant(event.type)}>
                    {typeLabel(event.type)}
                </Badge>
            ),
        },
        {
            id: 'room',
            header: 'Habitación',
            cell: (event) => event.room?.name ?? '—',
        },
        {
            id: 'reservation',
            header: 'Reserva',
            cell: (event) =>
                event.reservation ? (
                    <Link
                        href={showReservation(event.reservation.id)}
                        className="text-primary hover:underline"
                    >
                        #{event.reservation.id}
                        {event.reservation.client
                            ? ` · ${event.reservation.client.first_name}`
                            : ''}
                    </Link>
                ) : (
                    <span className="text-muted-foreground">—</span>
                ),
        },
        {
            id: 'startsAt',
            header: 'Inicio',
            cell: (event) => (
                <span className="text-sm text-muted-foreground">
                    {formatDateTime(event.starts_at)}
                </span>
            ),
        },
        {
            id: 'endsAt',
            header: 'Fin',
            cell: (event) => (
                <span className="text-sm text-muted-foreground">
                    {formatDateTime(event.ends_at)}
                </span>
            ),
        },
        {
            id: 'status',
            header: 'Estado',
            align: 'center',
            cell: (event) => (
                <StatusBadge status="Activo" active={event.active} />
            ),
        },
        {
            id: 'actions',
            header: 'Acciones',
            align: 'right',
            cell: (event) => (
                <RowActions
                    actions={[
                        {
                            label: 'Editar',
                            icon: Pencil,
                            href: editEvent(event.id),
                        },
                        {
                            label: 'Ver detalle',
                            icon: Eye,
                            href: showEvent(event.id),
                        },
                        event.active
                            ? {
                                  label: 'Eliminar',
                                  icon: Trash2,
                                  destructive: true,
                                  onSelect: () =>
                                      recordAction.request({
                                          id: event.id,
                                          action: 'delete',
                                          name: event.title,
                                      }),
                              }
                            : {
                                  label: 'Restaurar',
                                  icon: RefreshCw,
                                  success: true,
                                  onSelect: () =>
                                      recordAction.request({
                                          id: event.id,
                                          action: 'restore',
                                          name: event.title,
                                      }),
                              },
                    ]}
                />
            ),
        },
    ];

    const pending = recordAction.pending;
    const isDelete = pending?.action === 'delete';

    return (
        <>
            <Head title="Calendario" />

            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <PageHeader
                    title="Calendario"
                    description="Organiza eventos, bloqueos y mantenimientos por habitación."
                    actions={
                        <Button asChild>
                            <Link href={createEvent()}>
                                <Plus className="size-4" />
                                Nuevo evento
                            </Link>
                        </Button>
                    }
                />

                <ListFilters
                    url={calendarsIndex.url()}
                    search={filters.search}
                    searchPlaceholder="Buscar por título, tipo o descripción"
                    selects={[
                        {
                            key: 'type',
                            label: 'Tipo',
                            options: typeOptions,
                            value: filters.type,
                        },
                        {
                            key: 'status',
                            label: 'Registro',
                            options: statusOptions,
                            value: filters.status,
                        },
                    ]}
                />

                <DataTable
                    caption="Eventos del calendario"
                    columns={columns}
                    rows={events.data}
                    rowKey={(event) => event.id}
                    empty={
                        <EmptyState
                            icon={CalendarDays}
                            title={
                                hasFilters
                                    ? 'Sin resultados'
                                    : 'El calendario está vacío'
                            }
                            description={
                                hasFilters
                                    ? 'Ajusta la búsqueda o los filtros para encontrar el evento.'
                                    : 'Agrega un evento o un bloqueo para una de tus habitaciones.'
                            }
                            action={
                                !hasFilters && (
                                    <Button asChild>
                                        <Link href={createEvent()}>
                                            <Plus className="size-4" />
                                            Nuevo evento
                                        </Link>
                                    </Button>
                                )
                            }
                        />
                    }
                    footer={<Pagination meta={events} />}
                />
            </div>

            <ConfirmDialog
                open={pending !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        recordAction.close();
                    }
                }}
                title={isDelete ? 'Desactivar evento' : 'Restaurar evento'}
                description={
                    pending
                        ? isDelete
                            ? `El evento "${pending.name}" se quitará del calendario activo hasta que lo restaures.`
                            : `El evento "${pending.name}" volverá a mostrarse en el calendario.`
                        : undefined
                }
                confirmLabel={isDelete ? 'Desactivar' : 'Restaurar'}
                destructive={isDelete}
                processing={recordAction.processing}
                onConfirm={recordAction.confirm}
            />
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
