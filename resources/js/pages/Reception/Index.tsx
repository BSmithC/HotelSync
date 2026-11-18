import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    BedDouble,
    CalendarDays,
    CheckCircle2,
    Clock,
    DoorOpen,
    LogIn,
    LogOut,
    Plus,
    Search,
    Sparkles,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table';
import type { DataTableColumn } from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { ListFilters } from '@/components/list-filters';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { ChangeRoomDialog } from '@/components/reception/change-room-dialog';
import { CheckInDialog } from '@/components/reception/check-in-dialog';
import { IncidentActionDialog } from '@/components/reception/incident-action-dialog';
import { IncidentDialog } from '@/components/reception/incident-dialog';
import { RoomStatusDialog } from '@/components/reception/room-status-dialog';
import { RowActions } from '@/components/row-actions';
import type { RowAction } from '@/components/row-actions';
import { StatCard } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatDate, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { checkOut, index as receptionIndex } from '@/routes/reception';
import { show as guestShow } from '@/routes/reception/guests';
import { show as reservationShow } from '@/routes/reservations';
import type {
    Paginated,
    ReceptionFilters,
    ReceptionIncident,
    ReceptionKpis,
    ReceptionOptions,
    ReceptionPermissions,
    ReceptionQuickSearch,
    ReceptionReservation,
    ReceptionRoom,
    ReceptionRoomCounts,
    ReservationOption,
    RoomOption,
} from '@/types';

type Tab =
    | 'resumen'
    | 'llegadas'
    | 'salidas'
    | 'alojados'
    | 'habitaciones'
    | 'incidencias';

const roomStatusLabels: Record<string, string> = {
    disponible: 'Disponible',
    ocupada: 'Ocupada',
    reservada: 'Reservada',
    mantenimiento: 'Mantenimiento',
};

const roomStatusStyles: Record<string, string> = {
    disponible:
        'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    ocupada: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
    reservada:
        'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    mantenimiento:
        'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
};

const incidentTypeLabels: Record<string, string> = {
    mantenimiento: 'Mantenimiento',
    limpieza: 'Limpieza',
    huesped: 'Huésped',
    seguridad: 'Seguridad',
    otro: 'Otro',
};

const incidentStatusLabels: Record<string, string> = {
    abierta: 'Abierta',
    en_proceso: 'En proceso',
    resuelta: 'Resuelta',
};

const incidentStatusStyles: Record<string, string> = {
    abierta:
        'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    en_proceso: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
    resuelta:
        'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
};

const severityLabels: Record<string, string> = {
    baja: 'Baja',
    media: 'Media',
    alta: 'Alta',
};

function guestName(reservation: ReceptionReservation): string {
    if (!reservation.client) {
        return `Reservación #${reservation.id}`;
    }

    return `${reservation.client.first_name} ${reservation.client.last_name}`;
}

function RoomStatusBadge({ status }: { status: string }) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                roomStatusStyles[status] ?? 'bg-muted text-muted-foreground',
            )}
        >
            {roomStatusLabels[status] ?? status}
        </span>
    );
}

function IncidentStatusBadge({ status }: { status: string }) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                incidentStatusStyles[status] ??
                    'bg-muted text-muted-foreground',
            )}
        >
            {incidentStatusLabels[status] ?? status}
        </span>
    );
}

function SeverityBadge({ severity }: { severity: string }) {
    const styles: Record<string, string> = {
        alta: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
        media: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
        baja: 'bg-muted text-muted-foreground',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                styles[severity] ?? styles.baja,
            )}
        >
            {severityLabels[severity] ?? severity}
        </span>
    );
}

function PendingCard({
    icon: Icon,
    label,
    value,
    hint,
    tone,
    onClick,
}: {
    icon: LucideIcon;
    label: string;
    value: number;
    hint: string;
    tone: 'warning' | 'danger' | 'primary';
    onClick: () => void;
}) {
    const tones = {
        warning: 'bg-warning/10 text-warning',
        danger: 'bg-destructive/10 text-destructive',
        primary: 'bg-primary/10 text-primary',
    } as const;

    return (
        <button
            type="button"
            onClick={onClick}
            className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
        >
            <span
                className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-xl',
                    tones[tone],
                )}
            >
                <Icon className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground">
                    {label}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                    {hint}
                </span>
            </span>
            <span className="flex items-center gap-1 text-lg font-semibold text-foreground">
                {value}
                <ArrowRight className="size-4 text-muted-foreground" />
            </span>
        </button>
    );
}

export default function Index({
    timezone,
    day,
    kpis,
    roomCounts,
    arrivals,
    departures,
    inHouse,
    rooms,
    roomsForAssignment,
    roomsForIncidents,
    inHouseOptions,
    incidents,
    quickSearch,
    filters,
    options,
    permissions,
}: {
    timezone: string;
    day: string;
    isToday: boolean;
    kpis: ReceptionKpis;
    roomCounts: ReceptionRoomCounts;
    arrivals: Paginated<ReceptionReservation>;
    departures: Paginated<ReceptionReservation>;
    inHouse: Paginated<ReceptionReservation>;
    rooms: Paginated<ReceptionRoom>;
    roomsForAssignment: RoomOption[];
    roomsForIncidents: RoomOption[];
    inHouseOptions: ReservationOption[];
    incidents: Paginated<ReceptionIncident>;
    quickSearch: ReceptionQuickSearch | null;
    filters: ReceptionFilters;
    options: ReceptionOptions;
    permissions: ReceptionPermissions;
}) {
    const [tab, setTab] = useState<Tab>('resumen');
    const [checkInTarget, setCheckInTarget] =
        useState<ReceptionReservation | null>(null);
    const [checkOutTarget, setCheckOutTarget] =
        useState<ReceptionReservation | null>(null);
    const [changeRoomTarget, setChangeRoomTarget] =
        useState<ReceptionReservation | null>(null);
    const [roomTarget, setRoomTarget] = useState<ReceptionRoom | null>(null);
    const [incidentOpen, setIncidentOpen] = useState(false);
    const [incidentPreset, setIncidentPreset] =
        useState<ReservationOption | null>(null);
    const [incidentTarget, setIncidentTarget] =
        useState<ReceptionIncident | null>(null);
    const [incidentAction, setIncidentAction] = useState<
        'en_proceso' | 'resuelta'
    >('en_proceso');
    const [processing, setProcessing] = useState(false);

    const visit = (params: Record<string, string>) => {
        const query: Record<string, string> = { ...filters, ...params };

        Object.keys(query).forEach((key) => {
            if (query[key] === '') {
                delete query[key];
            }
        });

        router.get(receptionIndex.url(), query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const confirmCheckOut = () => {
        if (checkOutTarget === null) {
            return;
        }

        router.post(
            checkOut(checkOutTarget.id),
            {},
            {
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onFinish: () => {
                    setProcessing(false);
                    setCheckOutTarget(null);
                },
            },
        );
    };

    const openIncident = (reservation: ReceptionReservation | null) => {
        setIncidentPreset(
            reservation
                ? {
                      id: reservation.id,
                      room_id: reservation.room_id,
                      client: reservation.client
                          ? {
                                first_name: reservation.client.first_name,
                                last_name: reservation.client.last_name,
                            }
                          : null,
                  }
                : null,
        );
        setIncidentOpen(true);
    };

    const guestUrl = (reservation: ReceptionReservation) =>
        guestShow(reservation.client?.id ?? reservation.client_id);

    const actionMenu = (reservation: ReceptionReservation): RowAction[] => {
        const actions: RowAction[] = [
            {
                label: 'Ver huésped',
                icon: Users,
                href: guestUrl(reservation),
            },
        ];

        if (
            permissions.operate &&
            reservation.checked_in_at === null &&
            ['Pendiente', 'Confirmada'].includes(reservation.status)
        ) {
            actions.unshift({
                label: 'Registrar check-in',
                icon: LogIn,
                onSelect: () => setCheckInTarget(reservation),
            });
        }

        if (permissions.operate && reservation.status === 'En curso') {
            actions.push(
                {
                    label: 'Cambiar habitación',
                    icon: DoorOpen,
                    onSelect: () => setChangeRoomTarget(reservation),
                },
                {
                    label: 'Registrar check-out',
                    icon: LogOut,
                    onSelect: () => setCheckOutTarget(reservation),
                },
            );
        }

        if (permissions.incidents) {
            actions.push({
                label: 'Nueva incidencia',
                icon: AlertTriangle,
                onSelect: () => openIncident(reservation),
            });
        }

        return actions;
    };

    const reservationColumns = (
        extra: DataTableColumn<ReceptionReservation>[] = [],
    ): DataTableColumn<ReceptionReservation>[] => [
        {
            id: 'guest',
            header: 'Huésped',
            cell: (reservation) => (
                <div className="min-w-0">
                    <Link
                        href={guestUrl(reservation)}
                        className="font-medium text-foreground transition-colors hover:text-primary"
                    >
                        {guestName(reservation)}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                        {reservation.client?.phone_number ??
                            `Reserva #${reservation.id}`}
                    </p>
                </div>
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
            id: 'entry',
            header: 'Entrada',
            cell: (reservation) => (
                <span className="text-sm text-muted-foreground">
                    {formatDateTime(reservation.reserved_at)}
                </span>
            ),
        },
        {
            id: 'exit',
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
            cell: (reservation) => (
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="size-3.5" />
                    {reservation.guests}
                </span>
            ),
        },
        ...extra,
        {
            id: 'status',
            header: 'Estado',
            align: 'center',
            cell: (reservation) => (
                <div className="flex flex-col items-center gap-1">
                    <StatusBadge status={reservation.status} />
                    {reservation.checked_in_at && (
                        <span className="text-[11px] text-muted-foreground">
                            {formatDateTime(reservation.checked_in_at)}
                        </span>
                    )}
                </div>
            ),
        },
        {
            id: 'actions',
            header: 'Acciones',
            align: 'right',
            cell: (reservation) => (
                <RowActions actions={actionMenu(reservation)} />
            ),
        },
    ];

    const roomColumns: DataTableColumn<ReceptionRoom>[] = [
        {
            id: 'name',
            header: 'Habitación',
            cell: (room) => (
                <div>
                    <p className="font-medium text-foreground">{room.name}</p>
                    <p className="text-xs text-muted-foreground">
                        {room.area?.name ?? 'Sin área'} · {room.capacity}{' '}
                        huésped(es)
                    </p>
                </div>
            ),
        },
        {
            id: 'status',
            header: 'Estado',
            cell: (room) => <RoomStatusBadge status={room.status} />,
        },
        {
            id: 'guest',
            header: 'Huésped actual',
            cell: (room) =>
                room.current_reservation ? (
                    <Link
                        href={guestShow(
                            room.current_reservation.client?.id ??
                                room.current_reservation.client_id,
                        )}
                        className="text-sm font-medium text-primary hover:underline"
                    >
                        {guestName(room.current_reservation)}
                    </Link>
                ) : (
                    <span className="text-sm text-muted-foreground">
                        Sin huésped
                    </span>
                ),
        },
        {
            id: 'departure',
            header: 'Salida prevista',
            cell: (room) => (
                <span className="text-sm text-muted-foreground">
                    {room.current_reservation
                        ? formatDateTime(room.current_reservation.finished_at)
                        : '—'}
                </span>
            ),
        },
        {
            id: 'actions',
            header: 'Acciones',
            align: 'right',
            cell: (room) => (
                <RowActions
                    actions={[
                        ...(permissions.operate
                            ? [
                                  {
                                      label: 'Cambiar estado',
                                      icon: DoorOpen,
                                      onSelect: () => setRoomTarget(room),
                                  },
                              ]
                            : []),
                        ...(room.current_reservation
                            ? [
                                  {
                                      label: 'Ver huésped',
                                      icon: Users,
                                      href: guestShow(
                                          room.current_reservation.client?.id ??
                                              room.current_reservation
                                                  .client_id,
                                      ),
                                  },
                              ]
                            : []),
                    ]}
                />
            ),
        },
    ];

    const incidentColumns: DataTableColumn<ReceptionIncident>[] = [
        {
            id: 'title',
            header: 'Incidencia',
            cell: (incident) => (
                <div className="min-w-0 space-y-1">
                    <p className="font-medium text-foreground">
                        {incident.title}
                    </p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                        {incident.description}
                    </p>
                </div>
            ),
        },
        {
            id: 'type',
            header: 'Tipo',
            cell: (incident) => (
                <div className="space-y-1">
                    <p className="text-sm text-foreground">
                        {incidentTypeLabels[incident.type] ?? incident.type}
                    </p>
                    <SeverityBadge severity={incident.severity} />
                </div>
            ),
        },
        {
            id: 'location',
            header: 'Ubicación',
            cell: (incident) => (
                <div className="text-sm text-muted-foreground">
                    {incident.room?.name ?? 'Sin habitación'}
                    {incident.reservation && (
                        <span className="block text-xs">
                            Reserva #{incident.reservation.id}
                        </span>
                    )}
                </div>
            ),
        },
        {
            id: 'reporter',
            header: 'Reportada por',
            cell: (incident) => (
                <div className="text-sm text-muted-foreground">
                    {incident.reported_by?.name ?? 'Sistema'}
                    <span className="block text-xs">
                        {formatDateTime(incident.created_at)}
                    </span>
                </div>
            ),
        },
        {
            id: 'status',
            header: 'Estado',
            align: 'center',
            cell: (incident) => (
                <IncidentStatusBadge status={incident.status} />
            ),
        },
        {
            id: 'actions',
            header: 'Acciones',
            align: 'right',
            cell: (incident) => (
                <RowActions
                    actions={[
                        ...(permissions.incidents &&
                        incident.status === 'abierta'
                            ? [
                                  {
                                      label: 'Iniciar atención',
                                      icon: Clock,
                                      onSelect: () => {
                                          setIncidentAction('en_proceso');
                                          setIncidentTarget(incident);
                                      },
                                  },
                              ]
                            : []),
                        ...(permissions.incidents &&
                        incident.status !== 'resuelta'
                            ? [
                                  {
                                      label: 'Resolver',
                                      icon: CheckCircle2,
                                      success: true,
                                      onSelect: () => {
                                          setIncidentAction('resuelta');
                                          setIncidentTarget(incident);
                                      },
                                  },
                              ]
                            : []),
                    ]}
                />
            ),
        },
    ];

    const tabs: { id: Tab; label: string; count?: number }[] = [
        { id: 'resumen', label: 'Resumen' },
        { id: 'llegadas', label: 'Llegadas', count: arrivals.total },
        { id: 'salidas', label: 'Salidas', count: departures.total },
        { id: 'alojados', label: 'Alojados', count: inHouse.total },
        { id: 'habitaciones', label: 'Habitaciones', count: rooms.total },
        { id: 'incidencias', label: 'Incidencias', count: incidents.total },
    ];

    const hasFilters = Boolean(
        filters.search || filters.state || filters.incident_status,
    );

    return (
        <>
            <Head title="Recepción" />

            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <PageHeader
                    title="Recepción"
                    description="Centro de operaciones: llegadas, salidas, huéspedes alojados, habitaciones e incidencias."
                    actions={
                        <>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="date"
                                    value={filters.date}
                                    onChange={(event) =>
                                        visit({ date: event.target.value })
                                    }
                                    aria-label="Fecha operativa"
                                    className="w-auto"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => visit({ date: '' })}
                                >
                                    <CalendarDays className="size-4" />
                                    Hoy
                                </Button>
                            </div>
                            {permissions.incidents && (
                                <Button
                                    type="button"
                                    onClick={() => openIncident(null)}
                                >
                                    <Plus className="size-4" />
                                    Nueva incidencia
                                </Button>
                            )}
                        </>
                    }
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        label="Llegadas del día"
                        value={kpis.arrivals}
                        hint={`${kpis.pendingArrivals} pendientes de check-in`}
                        icon={LogIn}
                        tone="primary"
                    />
                    <StatCard
                        label="Salidas del día"
                        value={kpis.departures}
                        hint={`${kpis.overdueDepartures} con salida atrasada`}
                        icon={LogOut}
                        tone="warning"
                    />
                    <StatCard
                        label="Huéspedes alojados"
                        value={kpis.inHouse}
                        hint="Reservaciones en curso"
                        icon={Users}
                        tone="success"
                    />
                    <StatCard
                        label="Habitaciones"
                        value={`${kpis.availableRooms} / ${roomCounts.disponible + roomCounts.ocupada + roomCounts.reservada + roomCounts.mantenimiento}`}
                        hint={`${kpis.occupiedRooms} ocupadas · ${roomCounts.mantenimiento} en mantenimiento`}
                        icon={BedDouble}
                        tone="primary"
                    />
                </div>

                <ListFilters
                    url={receptionIndex.url()}
                    search={filters.search}
                    searchPlaceholder="Buscar huésped, cédula, teléfono, habitación..."
                    selects={[
                        {
                            key: 'state',
                            label: 'Estado de habitación',
                            options: options.roomStatuses.map((status) => ({
                                value: status,
                                label: roomStatusLabels[status] ?? status,
                            })),
                            value: filters.state,
                        },
                        {
                            key: 'incident_status',
                            label: 'Estado de incidencia',
                            options: options.incidentStatuses.map((status) => ({
                                value: status,
                                label: incidentStatusLabels[status] ?? status,
                            })),
                            value: filters.incident_status,
                        },
                    ]}
                    extraParams={{ date: filters.date }}
                />

                {quickSearch && (
                    <Card className="shadow-xs">
                        <CardContent className="space-y-3 p-4">
                            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                <Search className="size-4 text-muted-foreground" />
                                Resultados rápidos
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-1.5">
                                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                        Huéspedes
                                    </p>
                                    {quickSearch.clients.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">
                                            Sin huéspedes coincidentes.
                                        </p>
                                    ) : (
                                        quickSearch.clients.map((client) => (
                                            <Link
                                                key={client.id}
                                                href={guestShow(client.id)}
                                                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:border-primary/40 hover:bg-muted/40"
                                            >
                                                <span className="font-medium text-foreground">
                                                    {client.first_name}{' '}
                                                    {client.last_name}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {client.cedula ??
                                                        client.phone_number ??
                                                        ''}
                                                </span>
                                            </Link>
                                        ))
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                        Reservaciones
                                    </p>
                                    {quickSearch.reservations.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">
                                            Sin reservaciones coincidentes.
                                        </p>
                                    ) : (
                                        quickSearch.reservations.map(
                                            (reservation) => (
                                                <Link
                                                    key={reservation.id}
                                                    href={reservationShow(
                                                        reservation.id,
                                                    )}
                                                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:border-primary/40 hover:bg-muted/40"
                                                >
                                                    <span className="font-medium text-foreground">
                                                        #{reservation.id} ·{' '}
                                                        {guestName(reservation)}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {reservation.room
                                                            ?.name ??
                                                            'Sin habitación'}
                                                    </span>
                                                </Link>
                                            ),
                                        )
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1">
                    {tabs.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => setTab(item.id)}
                            className={cn(
                                'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                tab === item.id
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                            )}
                        >
                            {item.label}
                            {item.count !== undefined && (
                                <span
                                    className={cn(
                                        'rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
                                        tab === item.id
                                            ? 'bg-white/20 text-primary-foreground'
                                            : 'bg-muted text-muted-foreground',
                                    )}
                                >
                                    {item.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {tab === 'resumen' && (
                    <div className="space-y-4">
                        <div className="grid gap-3 md:grid-cols-3">
                            <PendingCard
                                icon={LogIn}
                                label="Check-ins pendientes"
                                value={kpis.pendingArrivals}
                                hint="Llegadas del día sin registrar"
                                tone="primary"
                                onClick={() => setTab('llegadas')}
                            />
                            <PendingCard
                                icon={Clock}
                                label="Salidas atrasadas"
                                value={kpis.overdueDepartures}
                                hint="Huéspedes que debieron salir"
                                tone="warning"
                                onClick={() => setTab('salidas')}
                            />
                            <PendingCard
                                icon={AlertTriangle}
                                label="Incidencias abiertas"
                                value={kpis.openIncidents}
                                hint="Requieren seguimiento"
                                tone="danger"
                                onClick={() => setTab('incidencias')}
                            />
                        </div>

                        <div className="grid gap-4 xl:grid-cols-2">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-sm font-semibold text-foreground">
                                        Llegadas de la fecha
                                    </h2>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setTab('llegadas')}
                                    >
                                        Ver todas
                                        <ArrowRight className="size-3.5" />
                                    </Button>
                                </div>
                                <DataTable
                                    caption="Llegadas de la fecha"
                                    columns={reservationColumns()}
                                    rows={arrivals.data.slice(0, 5)}
                                    rowKey={(reservation) => reservation.id}
                                    tableClassName="min-w-140"
                                    empty={
                                        <EmptyState
                                            icon={LogIn}
                                            title="Sin llegadas"
                                            description={`No hay llegadas registradas para el ${formatDate(day)}.`}
                                        />
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-sm font-semibold text-foreground">
                                        Salidas pendientes
                                    </h2>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setTab('salidas')}
                                    >
                                        Ver todas
                                        <ArrowRight className="size-3.5" />
                                    </Button>
                                </div>
                                <DataTable
                                    caption="Salidas pendientes"
                                    columns={reservationColumns()}
                                    rows={departures.data.slice(0, 5)}
                                    rowKey={(reservation) => reservation.id}
                                    tableClassName="min-w-140"
                                    empty={
                                        <EmptyState
                                            icon={CheckCircle2}
                                            title="Sin salidas pendientes"
                                            description="Todos los huéspedes con salida prevista ya registraron check-out."
                                        />
                                    }
                                />
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'llegadas' && (
                    <DataTable
                        caption="Llegadas de la fecha"
                        columns={reservationColumns()}
                        rows={arrivals.data}
                        rowKey={(reservation) => reservation.id}
                        empty={
                            <EmptyState
                                icon={LogIn}
                                title={
                                    hasFilters
                                        ? 'Sin resultados'
                                        : 'Sin llegadas para esta fecha'
                                }
                                description={
                                    hasFilters
                                        ? 'Ajusta la búsqueda o la fecha para encontrar la llegada.'
                                        : `No hay reservaciones con entrada el ${formatDate(day)}.`
                                }
                            />
                        }
                        footer={<Pagination meta={arrivals} />}
                    />
                )}

                {tab === 'salidas' && (
                    <DataTable
                        caption="Salidas del día"
                        columns={reservationColumns()}
                        rows={departures.data}
                        rowKey={(reservation) => reservation.id}
                        empty={
                            <EmptyState
                                icon={LogOut}
                                title={
                                    hasFilters
                                        ? 'Sin resultados'
                                        : 'Sin salidas pendientes'
                                }
                                description={
                                    hasFilters
                                        ? 'Ajusta la búsqueda para encontrar la salida.'
                                        : 'No hay huéspedes alojados con salida prevista para esta fecha.'
                                }
                            />
                        }
                        footer={<Pagination meta={departures} />}
                    />
                )}

                {tab === 'alojados' && (
                    <DataTable
                        caption="Huéspedes alojados"
                        columns={reservationColumns([
                            {
                                id: 'checkIn',
                                header: 'Check-in',
                                cell: (reservation) => (
                                    <span className="text-sm text-muted-foreground">
                                        {formatDateTime(
                                            reservation.checked_in_at,
                                        )}
                                    </span>
                                ),
                            },
                        ])}
                        rows={inHouse.data}
                        rowKey={(reservation) => reservation.id}
                        empty={
                            <EmptyState
                                icon={Users}
                                title={
                                    hasFilters
                                        ? 'Sin resultados'
                                        : 'No hay huéspedes alojados'
                                }
                                description={
                                    hasFilters
                                        ? 'Ajusta la búsqueda para encontrar al huésped.'
                                        : 'Registra un check-in para comenzar la operación del día.'
                                }
                            />
                        }
                        footer={<Pagination meta={inHouse} />}
                    />
                )}

                {tab === 'habitaciones' && (
                    <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                size="sm"
                                variant={
                                    filters.state === '' ? 'default' : 'outline'
                                }
                                onClick={() => visit({ state: '' })}
                            >
                                Todas
                            </Button>
                            {options.roomStatuses.map((status) => (
                                <Button
                                    key={status}
                                    type="button"
                                    size="sm"
                                    variant={
                                        filters.state === status
                                            ? 'default'
                                            : 'outline'
                                    }
                                    onClick={() => visit({ state: status })}
                                >
                                    {roomStatusLabels[status] ?? status}
                                    <Badge
                                        variant="secondary"
                                        className="ml-1 h-5 px-1.5 text-[10px]"
                                    >
                                        {roomCounts[
                                            status as keyof ReceptionRoomCounts
                                        ] ?? 0}
                                    </Badge>
                                </Button>
                            ))}
                        </div>

                        <DataTable
                            caption="Estado de habitaciones"
                            columns={roomColumns}
                            rows={rooms.data}
                            rowKey={(room) => room.id}
                            empty={
                                <EmptyState
                                    icon={BedDouble}
                                    title={
                                        hasFilters
                                            ? 'Sin habitaciones'
                                            : 'No hay habitaciones registradas'
                                    }
                                    description={
                                        hasFilters
                                            ? 'Ajusta el estado o la búsqueda para ver otras habitaciones.'
                                            : 'Crea habitaciones desde el módulo de habitaciones para operar recepción.'
                                    }
                                />
                            }
                            footer={<Pagination meta={rooms} />}
                        />
                    </div>
                )}

                {tab === 'incidencias' && (
                    <DataTable
                        caption="Incidencias operativas"
                        columns={incidentColumns}
                        rows={incidents.data}
                        rowKey={(incident) => incident.id}
                        empty={
                            <EmptyState
                                icon={Sparkles}
                                title={
                                    hasFilters
                                        ? 'Sin resultados'
                                        : 'Sin incidencias abiertas'
                                }
                                description={
                                    hasFilters
                                        ? 'Ajusta el estado o la búsqueda para encontrar la incidencia.'
                                        : 'No hay incidencias abiertas. Registra una cuando detectes un problema operativo.'
                                }
                                action={
                                    permissions.incidents && !hasFilters ? (
                                        <Button
                                            type="button"
                                            onClick={() => openIncident(null)}
                                        >
                                            <Plus className="size-4" />
                                            Nueva incidencia
                                        </Button>
                                    ) : undefined
                                }
                            />
                        }
                        footer={<Pagination meta={incidents} />}
                    />
                )}

                <p className="text-xs text-muted-foreground">
                    Zona horaria del hotel: {timezone}. Las fechas se muestran
                    en hora local.
                </p>
            </div>

            <CheckInDialog
                reservation={checkInTarget}
                rooms={roomsForAssignment}
                onClose={() => setCheckInTarget(null)}
            />

            <ChangeRoomDialog
                reservation={changeRoomTarget}
                rooms={roomsForAssignment}
                onClose={() => setChangeRoomTarget(null)}
            />

            <RoomStatusDialog
                room={roomTarget}
                statuses={options.roomStatuses}
                onClose={() => setRoomTarget(null)}
            />

            <IncidentDialog
                open={incidentOpen}
                rooms={roomsForIncidents}
                reservations={inHouseOptions}
                presetReservation={incidentPreset}
                types={options.incidentTypes}
                severities={options.incidentSeverities}
                onClose={() => {
                    setIncidentOpen(false);
                    setIncidentPreset(null);
                }}
            />

            <IncidentActionDialog
                incident={incidentTarget}
                action={incidentAction}
                onClose={() => setIncidentTarget(null)}
            />

            <ConfirmDialog
                open={checkOutTarget !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setCheckOutTarget(null);
                    }
                }}
                title="Registrar check-out"
                description={
                    checkOutTarget
                        ? `Se cerrará la estancia de ${guestName(checkOutTarget)} y la habitación ${checkOutTarget.room?.name ?? ''} quedará disponible.`
                        : undefined
                }
                confirmLabel="Registrar check-out"
                destructive={false}
                processing={processing}
                onConfirm={confirmCheckOut}
            />
        </>
    );
}

Index.layout = {
    breadcrumbs: [
        {
            title: 'Recepción',
            href: '/reception',
        },
    ],
};
