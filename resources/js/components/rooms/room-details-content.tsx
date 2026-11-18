import { usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    BedDouble,
    CalendarClock,
    CircleDollarSign,
    History,
    Info,
    Phone,
    Ruler,
    Sparkles,
    UserRound,
    Wrench,
} from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDateTime } from '@/lib/format';
import {
    roomStatusBadgeClass,
    roomStatusColor,
    roomStatusLabel,
} from '@/lib/room-status';
import { cn } from '@/lib/utils';
import type {
    HotelSharedProps,
    RoomDetails,
    RoomReservation,
    RoomStatusColors,
} from '@/types';

type Tab = 'resumen' | 'ocupacion' | 'historial';

function guestName(reservation: RoomReservation | null): string {
    if (reservation?.client) {
        return `${reservation.client.first_name} ${reservation.client.last_name}`;
    }

    return reservation ? `Reservación #${reservation.id}` : '—';
}

function Fact({
    icon,
    label,
    children,
}: {
    icon: ReactNode;
    label: string;
    children: ReactNode;
}) {
    return (
        <div className="flex items-start gap-2.5">
            <span className="mt-0.5 text-muted-foreground">{icon}</span>
            <div className="min-w-0">
                <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
                    {label}
                </dt>
                <dd className="truncate text-sm font-medium text-foreground">
                    {children}
                </dd>
            </div>
        </div>
    );
}

function Section({
    title,
    action,
    children,
}: {
    title: string;
    action?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {title}
                </h3>
                {action}
            </div>
            {children}
        </section>
    );
}

function ReservationCard({
    reservation,
    empty,
}: {
    reservation: RoomReservation | null;
    empty: string;
}) {
    if (reservation === null) {
        return (
            <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                {empty}
            </p>
        );
    }

    return (
        <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                        {guestName(reservation)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Reservación #{reservation.id}
                    </p>
                </div>
                <Badge variant="secondary">{reservation.status}</Badge>
            </div>

            <dl className="grid grid-cols-1 gap-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">Entrada</dt>
                    <dd className="font-medium">
                        {formatDateTime(reservation.reserved_at)}
                    </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">Salida</dt>
                    <dd className="font-medium">
                        {formatDateTime(reservation.finished_at)}
                    </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">Huéspedes</dt>
                    <dd className="font-medium">{reservation.guests}</dd>
                </div>
                {reservation.checked_in_at && (
                    <div className="flex items-center justify-between gap-2">
                        <dt className="text-muted-foreground">Check-in</dt>
                        <dd className="font-medium">
                            {formatDateTime(reservation.checked_in_at)}
                        </dd>
                    </div>
                )}
                {reservation.client?.phone_number && (
                    <div className="flex items-center justify-between gap-2">
                        <dt className="text-muted-foreground">Teléfono</dt>
                        <dd className="font-medium">
                            {reservation.client.phone_number}
                        </dd>
                    </div>
                )}
                {reservation.client?.cedula && (
                    <div className="flex items-center justify-between gap-2">
                        <dt className="text-muted-foreground">Cédula</dt>
                        <dd className="font-medium">
                            {reservation.client.cedula}
                        </dd>
                    </div>
                )}
            </dl>

            {reservation.notes && (
                <p className="rounded bg-background/60 p-2 text-xs text-muted-foreground">
                    {reservation.notes}
                </p>
            )}
        </div>
    );
}

/**
 * Everything the map drawer and the Show page say about a room.
 *
 * Both surfaces render this component, so the information never diverges.
 */
export function RoomDetailsContent({
    room,
    colors,
    className,
}: {
    room: RoomDetails;
    colors: RoomStatusColors;
    className?: string;
}) {
    const [tab, setTab] = useState<Tab>('resumen');
    const currency =
        usePage<HotelSharedProps>().props.currentHotel?.currency ?? 'DOP';

    const statusColor = roomStatusColor(room.status, colors);
    const area = room.area;
    const hasOccupancy =
        room.current_reservation !== null || room.next_reservation !== null;

    const tabs: { key: Tab; label: string; count?: number }[] = [
        { key: 'resumen', label: 'Resumen' },
        {
            key: 'ocupacion',
            label: 'Ocupación',
            count: hasOccupancy
                ? Number(room.current_reservation !== null) +
                  Number(room.next_reservation !== null)
                : undefined,
        },
        {
            key: 'historial',
            label: 'Historial',
            count:
                room.status_history.length + room.assignments.length ||
                undefined,
        },
    ];

    return (
        <div className={cn('flex min-h-0 flex-col', className)}>
            <div
                className="flex flex-wrap items-center gap-1.5 border-b px-4 py-2.5"
                role="tablist"
                aria-label="Secciones de la habitación"
            >
                {tabs.map((item) => (
                    <button
                        key={item.key}
                        type="button"
                        role="tab"
                        aria-selected={tab === item.key}
                        onClick={() => setTab(item.key)}
                        className={cn(
                            'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                            tab === item.key
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                        )}
                    >
                        {item.label}
                        {item.count !== undefined && item.count > 0 && (
                            <span
                                className={cn(
                                    'ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums',
                                    tab === item.key
                                        ? 'bg-primary-foreground/20'
                                        : 'bg-muted',
                                )}
                            >
                                {item.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
                {tab === 'resumen' && (
                    <>
                        <Section title="Información general">
                            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                                <Fact
                                    icon={<Info className="size-3.5" />}
                                    label="Estado"
                                >
                                    <span
                                        className="inline-flex items-center gap-1.5"
                                        style={{ color: statusColor }}
                                    >
                                        <span
                                            className="size-2 rounded-full"
                                            style={{
                                                backgroundColor: statusColor,
                                            }}
                                            aria-hidden="true"
                                        />
                                        {roomStatusLabel(room.status)}
                                    </span>
                                </Fact>
                                <Fact
                                    icon={<BedDouble className="size-3.5" />}
                                    label="Categoría"
                                >
                                    {room.category ?? 'Sin categoría'}
                                </Fact>
                                <Fact
                                    icon={<UserRound className="size-3.5" />}
                                    label="Capacidad"
                                >
                                    {room.capacity}{' '}
                                    {room.capacity === 1
                                        ? 'huésped'
                                        : 'huéspedes'}
                                </Fact>
                                <Fact
                                    icon={<BedDouble className="size-3.5" />}
                                    label="Camas"
                                >
                                    {room.bed_count}
                                </Fact>
                                <Fact
                                    icon={
                                        <CircleDollarSign className="size-3.5" />
                                    }
                                    label="Tarifa"
                                >
                                    {room.price
                                        ? formatCurrency(room.price, currency)
                                        : 'No definida'}
                                </Fact>
                                <Fact
                                    icon={<Phone className="size-3.5" />}
                                    label="Teléfono"
                                >
                                    {room.phone ?? '—'}
                                </Fact>
                                <Fact
                                    icon={<Ruler className="size-3.5" />}
                                    label="Medidas"
                                >
                                    {room.width} × {room.height}
                                </Fact>
                                <Fact
                                    icon={<Wrench className="size-3.5" />}
                                    label="Área"
                                >
                                    {area?.name ?? 'Sin área'}
                                </Fact>
                            </dl>

                            {area && (area.floor !== null || area.building) && (
                                <p className="text-xs text-muted-foreground">
                                    {area.building
                                        ? `Edificio ${area.building.name}`
                                        : 'Sin edificio'}
                                    {area.floor !== null
                                        ? ` · Piso ${area.floor}`
                                        : ''}
                                </p>
                            )}
                        </Section>

                        <Section title="Comodidades">
                            {room.amenities.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                    {room.amenities.map((amenity) => (
                                        <span
                                            key={amenity}
                                            className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-foreground"
                                        >
                                            <Sparkles className="size-3 text-muted-foreground" />
                                            {amenity}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    Sin comodidades registradas.
                                </p>
                            )}
                        </Section>

                        <Section title="Descripción">
                            <p className="text-sm text-muted-foreground">
                                {room.description ?? 'Sin descripción.'}
                            </p>
                        </Section>

                        <Section
                            title="Incidencias abiertas"
                            action={
                                room.open_incidents.length > 0 ? (
                                    <Badge variant="destructive">
                                        {room.open_incidents.length}
                                    </Badge>
                                ) : undefined
                            }
                        >
                            {room.open_incidents.length > 0 ? (
                                <ul className="space-y-2">
                                    {room.open_incidents.map((incident) => (
                                        <li
                                            key={incident.id}
                                            className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3"
                                        >
                                            <div className="flex items-start gap-2">
                                                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium">
                                                        {incident.title}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {incident.description}
                                                    </p>
                                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                                        {formatDateTime(
                                                            incident.created_at,
                                                        )}
                                                        {incident.reported_by
                                                            ? ` · ${incident.reported_by.name}`
                                                            : ''}
                                                    </p>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    No hay incidencias abiertas.
                                </p>
                            )}
                        </Section>
                    </>
                )}

                {tab === 'ocupacion' && (
                    <>
                        <Section title="Huésped actual">
                            <ReservationCard
                                reservation={room.current_reservation}
                                empty="La habitación no tiene un huésped alojado."
                            />
                            {room.current_reservation?.checked_in_by && (
                                <p className="text-xs text-muted-foreground">
                                    Check-in registrado por{' '}
                                    {
                                        room.current_reservation.checked_in_by
                                            .name
                                    }
                                </p>
                            )}
                        </Section>

                        <Section title="Próxima reserva">
                            <ReservationCard
                                reservation={room.next_reservation}
                                empty="No hay reservas próximas para esta habitación."
                            />
                        </Section>

                        {room.assignments.length > 0 && (
                            <Section title="Cambios de habitación">
                                <ul className="space-y-2">
                                    {room.assignments
                                        .slice(0, 5)
                                        .map((assignment) => (
                                            <li
                                                key={assignment.id}
                                                className="rounded-lg border p-2.5 text-xs"
                                            >
                                                <p className="font-medium">
                                                    {assignment.from_room
                                                        ?.name ?? '—'}{' '}
                                                    →{' '}
                                                    {assignment.to_room?.name ??
                                                        '—'}
                                                </p>
                                                <p className="text-muted-foreground">
                                                    {formatDateTime(
                                                        assignment.assigned_at,
                                                    )}
                                                    {assignment.reason
                                                        ? ` · ${assignment.reason}`
                                                        : ''}
                                                </p>
                                            </li>
                                        ))}
                                </ul>
                            </Section>
                        )}
                    </>
                )}

                {tab === 'historial' && (
                    <>
                        <Section title="Cambios de estado">
                            {room.status_history.length > 0 ? (
                                <ol className="space-y-3">
                                    {room.status_history.map((entry) => (
                                        <li
                                            key={entry.id}
                                            className="flex gap-2.5"
                                        >
                                            <span
                                                className="mt-1 size-2 shrink-0 rounded-full"
                                                style={{
                                                    backgroundColor:
                                                        roomStatusColor(
                                                            entry.status,
                                                            colors,
                                                        ),
                                                }}
                                                aria-hidden="true"
                                            />
                                            <div className="min-w-0 border-b pb-3 last:border-0 last:pb-0">
                                                <p className="text-sm font-medium">
                                                    {entry.previous_status
                                                        ? `${roomStatusLabel(entry.previous_status)} → `
                                                        : ''}
                                                    {roomStatusLabel(
                                                        entry.status,
                                                    )}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatDateTime(
                                                        entry.created_at,
                                                    )}
                                                    {entry.changed_by
                                                        ? ` · ${entry.changed_by.name}`
                                                        : ''}
                                                </p>
                                                {entry.reason && (
                                                    <p className="text-xs text-muted-foreground">
                                                        {entry.reason}
                                                    </p>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    Todavía no hay cambios de estado
                                    registrados.
                                </p>
                            )}
                        </Section>

                        <Section title="Trazabilidad">
                            <div className="flex items-center gap-2 rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
                                <History className="size-4 shrink-0" />
                                <span>
                                    {room.status_history.length} cambios de
                                    estado y {room.assignments.length} cambios
                                    de habitación registrados.
                                </span>
                            </div>
                        </Section>

                        <Section title="Resumen operativo">
                            <div className="space-y-1.5 text-xs text-muted-foreground">
                                <p className="flex items-center gap-2">
                                    <CalendarClock className="size-3.5" />
                                    Estado actual:{' '}
                                    <Badge
                                        className={cn(
                                            roomStatusBadgeClass(room.status),
                                            'ml-auto',
                                        )}
                                    >
                                        {roomStatusLabel(room.status)}
                                    </Badge>
                                </p>
                                <p>
                                    {room.active
                                        ? 'La habitación está activa y disponible para operar.'
                                        : 'La habitación está inactiva: no se asigna en recepción.'}
                                </p>
                            </div>
                        </Section>
                    </>
                )}
            </div>
        </div>
    );
}
