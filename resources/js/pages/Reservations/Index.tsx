import { Head, Link } from '@inertiajs/react';
import {
    CalendarCheck,
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
import { Button } from '@/components/ui/button';
import { useRecordAction } from '@/hooks/use-record-action';
import { formatDateTime } from '@/lib/format';
import {
    create as createReservation,
    destroy as destroyReservation,
    edit as editReservation,
    index as reservationsIndex,
    restore as restoreReservation,
    show as showReservation,
} from '@/routes/reservations';
import type { ListFiltersState, Paginated } from '@/types';

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

const stateOptions = [
    'Pendiente',
    'Confirmada',
    'En curso',
    'Finalizada',
    'Cancelada',
].map((state) => ({ value: state, label: state }));

const statusOptions = [
    { value: '1', label: 'Activas' },
    { value: '0', label: 'Inactivas' },
];

function clientName(reservation: Reservation): string {
    if (!reservation.client) {
        return '—';
    }

    return `${reservation.client.first_name} ${reservation.client.last_name}`;
}

export default function Index({
    reservations,
    filters,
}: {
    reservations: Paginated<Reservation>;
    filters: ListFiltersState;
}) {
    const recordAction = useRecordAction({
        destroy: destroyReservation,
        restore: restoreReservation,
    });

    const hasFilters = Boolean(
        filters.search || filters.state || filters.status,
    );

    const columns: DataTableColumn<Reservation>[] = [
        {
            id: 'client',
            header: 'Huésped',
            cell: (reservation) => (
                <Link
                    href={showReservation(reservation.id)}
                    className="font-medium text-foreground transition-colors hover:text-primary"
                >
                    {clientName(reservation)}
                </Link>
            ),
        },
        {
            id: 'room',
            header: 'Habitación',
            cell: (reservation) => reservation.room?.name ?? '—',
        },
        {
            id: 'reservedAt',
            header: 'Entrada',
            cell: (reservation) => (
                <span className="text-sm text-muted-foreground">
                    {formatDateTime(reservation.reserved_at)}
                </span>
            ),
        },
        {
            id: 'finishedAt',
            header: 'Salida',
            cell: (reservation) => (
                <span className="text-sm text-muted-foreground">
                    {formatDateTime(reservation.finished_at)}
                </span>
            ),
        },
        {
            id: 'guests',
            header: 'Huéspedes',
            align: 'center',
            cell: (reservation) => reservation.guests,
        },
        {
            id: 'status',
            header: 'Estado',
            align: 'center',
            cell: (reservation) => (
                <StatusBadge
                    status={reservation.status}
                    active={reservation.active}
                />
            ),
        },
        {
            id: 'actions',
            header: 'Acciones',
            align: 'right',
            cell: (reservation) => {
                const name =
                    clientName(reservation) === '—'
                        ? `Reserva #${reservation.id}`
                        : clientName(reservation);

                return (
                    <RowActions
                        actions={[
                            {
                                label: 'Editar',
                                icon: Pencil,
                                href: editReservation(reservation.id),
                            },
                            {
                                label: 'Ver detalle',
                                icon: Eye,
                                href: showReservation(reservation.id),
                            },
                            reservation.active
                                ? {
                                      label: 'Cancelar',
                                      icon: Trash2,
                                      destructive: true,
                                      onSelect: () =>
                                          recordAction.request({
                                              id: reservation.id,
                                              action: 'delete',
                                              name,
                                          }),
                                  }
                                : {
                                      label: 'Restaurar',
                                      icon: RefreshCw,
                                      success: true,
                                      onSelect: () =>
                                          recordAction.request({
                                              id: reservation.id,
                                              action: 'restore',
                                              name,
                                          }),
                                  },
                        ]}
                    />
                );
            },
        },
    ];

    const pending = recordAction.pending;
    const isDelete = pending?.action === 'delete';

    return (
        <>
            <Head title="Reservaciones" />

            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <PageHeader
                    title="Reservaciones"
                    description="Controla las entradas, salidas y el estado de cada reserva."
                    actions={
                        <Button asChild>
                            <Link href={createReservation()}>
                                <Plus className="size-4" />
                                Nueva reservación
                            </Link>
                        </Button>
                    }
                />

                <ListFilters
                    url={reservationsIndex.url()}
                    search={filters.search}
                    searchPlaceholder="Buscar por huésped, habitación o estado"
                    selects={[
                        {
                            key: 'state',
                            label: 'Estado de reserva',
                            options: stateOptions,
                            value: filters.state,
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
                    caption="Reservaciones registradas"
                    columns={columns}
                    rows={reservations.data}
                    rowKey={(reservation) => reservation.id}
                    empty={
                        <EmptyState
                            icon={CalendarCheck}
                            title={
                                hasFilters
                                    ? 'Sin resultados'
                                    : 'No hay reservaciones registradas'
                            }
                            description={
                                hasFilters
                                    ? 'Ajusta la búsqueda o los filtros de estado para encontrar la reserva.'
                                    : 'Registra la primera reserva de un huésped en una de tus habitaciones.'
                            }
                            action={
                                !hasFilters && (
                                    <Button asChild>
                                        <Link href={createReservation()}>
                                            <Plus className="size-4" />
                                            Nueva reservación
                                        </Link>
                                    </Button>
                                )
                            }
                        />
                    }
                    footer={<Pagination meta={reservations} />}
                />
            </div>

            <ConfirmDialog
                open={pending !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        recordAction.close();
                    }
                }}
                title={
                    isDelete ? 'Cancelar reservación' : 'Restaurar reservación'
                }
                description={
                    pending
                        ? isDelete
                            ? `La reservación de "${pending.name}" quedará inactiva hasta que la restaures.`
                            : `La reservación de "${pending.name}" volverá a estar activa.`
                        : undefined
                }
                confirmLabel={isDelete ? 'Cancelar reservación' : 'Restaurar'}
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
            title: 'Reservaciones',
            href: '/reservations',
        },
    ],
};
