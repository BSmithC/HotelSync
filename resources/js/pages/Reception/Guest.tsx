import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    BedDouble,
    CalendarCheck,
    CheckCircle2,
    Phone,
    ShieldAlert,
    UserRound,
} from 'lucide-react';
import { DataTable } from '@/components/data-table';
import type { DataTableColumn } from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { StatCard } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import { index as receptionIndex } from '@/routes/reception';
import { show as reservationShow } from '@/routes/reservations';
import type {
    GuestStayStats,
    Paginated,
    ReceptionClient,
    ReceptionReservation,
} from '@/types';

export default function Guest({
    client,
    reservations,
    stats,
}: {
    client: ReceptionClient;
    reservations: Paginated<ReceptionReservation>;
    stats: GuestStayStats;
}) {
    const fullName = `${client.first_name} ${client.last_name}`;

    const columns: DataTableColumn<ReceptionReservation>[] = [
        {
            id: 'id',
            header: 'Reserva',
            cell: (reservation) => (
                <Link
                    href={reservationShow(reservation.id)}
                    className="font-mono text-sm font-semibold text-foreground transition-colors hover:text-primary"
                >
                    #{reservation.id}
                </Link>
            ),
        },
        {
            id: 'room',
            header: 'Habitación',
            cell: (reservation) => (
                <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <BedDouble className="size-3.5" />
                    {reservation.room?.name ?? 'Sin asignar'}
                </span>
            ),
        },
        {
            id: 'planned',
            header: 'Estancia prevista',
            cell: (reservation) => (
                <div className="text-sm text-muted-foreground">
                    <p>{formatDateTime(reservation.reserved_at)}</p>
                    <p className="text-xs">
                        {formatDateTime(reservation.finished_at)}
                    </p>
                </div>
            ),
        },
        {
            id: 'checkIn',
            header: 'Check-in real',
            cell: (reservation) => (
                <div className="text-sm text-muted-foreground">
                    <p>{formatDateTime(reservation.checked_in_at)}</p>
                    <p className="text-xs">
                        {reservation.checked_in_by?.name ?? '—'}
                    </p>
                </div>
            ),
        },
        {
            id: 'checkOut',
            header: 'Check-out real',
            cell: (reservation) => (
                <div className="text-sm text-muted-foreground">
                    <p>{formatDateTime(reservation.checked_out_at)}</p>
                    <p className="text-xs">
                        {reservation.checked_out_by?.name ?? '—'}
                    </p>
                </div>
            ),
        },
        {
            id: 'guests',
            header: 'Huéspedes',
            align: 'center',
            cell: (reservation) => (
                <span className="text-sm text-muted-foreground">
                    {reservation.guests}
                </span>
            ),
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
    ];

    return (
        <>
            <Head title={`Huésped · ${fullName}`} />

            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <PageHeader
                    title={fullName}
                    description="Historial de estancias, check-ins y check-outs registrados en el hotel activo."
                    actions={
                        <Link
                            href={receptionIndex()}
                            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                        >
                            <ArrowLeft className="size-4" />
                            Volver a recepción
                        </Link>
                    }
                >
                    <div className="flex flex-wrap items-center gap-4 pt-1 text-sm text-muted-foreground">
                        {client.cedula && (
                            <span className="inline-flex items-center gap-1.5">
                                <UserRound className="size-3.5" />
                                {client.cedula}
                            </span>
                        )}
                        {client.phone_number && (
                            <span className="inline-flex items-center gap-1.5">
                                <Phone className="size-3.5" />
                                {client.phone_number}
                            </span>
                        )}
                        {client.address && <span>{client.address}</span>}
                    </div>
                </PageHeader>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        label="Estancias registradas"
                        value={stats.stays}
                        icon={CalendarCheck}
                        tone="primary"
                    />
                    <StatCard
                        label="Estancias finalizadas"
                        value={stats.completed}
                        icon={CheckCircle2}
                        tone="success"
                    />
                    <StatCard
                        label="Estado actual"
                        value={stats.inHouse ? 'Alojado' : 'Fuera del hotel'}
                        hint={
                            stats.inHouse
                                ? 'Tiene una reservación en curso'
                                : 'Sin estancia activa'
                        }
                        icon={BedDouble}
                        tone={stats.inHouse ? 'success' : 'primary'}
                    />
                    <StatCard
                        label="Incidencias asociadas"
                        value={stats.incidents}
                        icon={ShieldAlert}
                        tone={stats.incidents > 0 ? 'warning' : 'primary'}
                    />
                </div>

                {client.active === false && (
                    <Card className="border-warning/40 bg-warning/5 shadow-xs">
                        <CardContent className="px-4 py-3 text-sm text-warning">
                            Este huésped está inactivo. El historial se
                            conserva, pero no debería usarse para nuevas
                            reservaciones.
                        </CardContent>
                    </Card>
                )}

                <DataTable
                    caption="Historial de estancias del huésped"
                    columns={columns}
                    rows={reservations.data}
                    rowKey={(reservation) => reservation.id}
                    empty={
                        <EmptyState
                            icon={CalendarCheck}
                            title="Sin estancias registradas"
                            description="Este huésped todavía no tiene reservaciones en el hotel activo."
                        />
                    }
                    footer={<Pagination meta={reservations} />}
                />

                {client.rnc && (
                    <p className="text-xs text-muted-foreground">
                        RNC: {client.rnc}
                    </p>
                )}
            </div>
        </>
    );
}

Guest.layout = {
    breadcrumbs: [
        {
            title: 'Recepción',
            href: '/reception',
        },
        {
            title: 'Historial del huésped',
            href: '/reception',
        },
    ],
};
