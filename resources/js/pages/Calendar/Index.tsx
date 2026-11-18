import { Head, Link, router } from '@inertiajs/react';
import {
    CalendarDays,
    CalendarPlus,
    ChevronLeft,
    ChevronRight,
    Eye,
    List,
    Pencil,
    Plus,
    RefreshCw,
    Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useRecordAction } from '@/hooks/use-record-action';
import { formatDate, formatDateTime, parseDate } from '@/lib/format';
import { cn } from '@/lib/utils';
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
    description?: string | null;
    starts_at: string;
    ends_at?: string | null;
    starts_on?: string;
    ends_on?: string;
    start_time?: string;
    end_time?: string;
    active: boolean;
    room?: { id: number; name: string } | null;
    reservation?: {
        id: number;
        client?: { first_name: string; last_name: string } | null;
    } | null;
}

interface CalendarMeta {
    month: string;
    label: string;
    grid_start: string;
    grid_end: string;
    today: string;
    previous: string;
    next: string;
    timezone: string;
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

const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const typeLabel = (type: string) =>
    type.charAt(0).toUpperCase() + type.slice(1);

const typeVariant = (type: string) => {
    if (type === 'bloqueo') {
        return 'destructive' as const;
    }

    if (type === 'mantenimiento') {
        return 'outline' as const;
    }

    return 'secondary' as const;
};

const typeChip = (type: string) => {
    if (type === 'bloqueo') {
        return 'bg-destructive/10 text-destructive hover:bg-destructive/20';
    }

    if (type === 'mantenimiento') {
        return 'bg-warning/15 text-warning-foreground hover:bg-warning/25';
    }

    return 'bg-primary/10 text-primary hover:bg-primary/20';
};

const typeDot = (type: string) => {
    if (type === 'bloqueo') {
        return 'bg-destructive';
    }

    if (type === 'mantenimiento') {
        return 'bg-warning';
    }

    return 'bg-primary';
};

const toIsoDay = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

const addDays = (value: string, amount: number) => {
    const date = parseDate(value);
    date.setDate(date.getDate() + amount);

    return toIsoDay(date);
};

const buildGridDays = (start: string, end: string) => {
    const days: string[] = [];
    let cursor = start;

    // Guard against malformed ranges: a month grid never exceeds six weeks.
    while (cursor <= end && days.length < 42) {
        days.push(cursor);
        cursor = addDays(cursor, 1);
    }

    return days;
};

const capitalize = (value: string) =>
    value.charAt(0).toUpperCase() + value.slice(1);

function ViewToggle({
    view,
    onChange,
}: {
    view: 'calendario' | 'lista';
    onChange: (view: 'calendario' | 'lista') => void;
}) {
    return (
        <div
            role="group"
            aria-label="Vista del calendario"
            className="inline-flex rounded-lg border border-border bg-muted/40 p-1"
        >
            <button
                type="button"
                aria-pressed={view === 'calendario'}
                onClick={() => onChange('calendario')}
                className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    view === 'calendario'
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                )}
            >
                <CalendarDays className="size-3.5" />
                Calendario
            </button>
            <button
                type="button"
                aria-pressed={view === 'lista'}
                onClick={() => onChange('lista')}
                className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    view === 'lista'
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                )}
            >
                <List className="size-3.5" />
                Lista
            </button>
        </div>
    );
}

export default function Index({
    events,
    monthEvents,
    view,
    calendar,
    filters,
}: {
    events: Paginated<Event>;
    monthEvents: Event[];
    view: 'calendario' | 'lista';
    calendar: CalendarMeta;
    filters: ListFiltersState;
}) {
    const recordAction = useRecordAction({
        destroy: destroyEvent,
        restore: restoreEvent,
    });

    const [loading, setLoading] = useState(false);
    const [selectedDay, setSelectedDay] = useState<string | null>(null);

    useEffect(() => {
        const offStart = router.on('start', () => setLoading(true));
        const offFinish = router.on('finish', () => setLoading(false));

        return () => {
            offStart();
            offFinish();
        };
    }, []);

    const hasFilters = Boolean(
        filters.search || filters.type || filters.status,
    );

    const extraParams = useMemo(
        () => ({
            month: calendar.month,
            ...(view === 'lista' ? { view: 'lista' } : {}),
        }),
        [calendar.month, view],
    );

    const buildParams = (
        overrides: Record<string, string | undefined> = {},
    ) => {
        const params: Record<string, string> = { ...extraParams };

        if (filters.search) {
            params.search = filters.search;
        }

        if (filters.status) {
            params.status = filters.status;
        }

        if (filters.type) {
            params.type = filters.type;
        }

        Object.entries(overrides).forEach(([key, value]) => {
            if (value === undefined || value === '') {
                delete params[key];
            } else {
                params[key] = value;
            }
        });

        return params;
    };

    const navigate = (overrides: Record<string, string | undefined>) => {
        router.get(calendarsIndex.url(), buildParams(overrides), {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const gridDays = buildGridDays(calendar.grid_start, calendar.grid_end);
    const currentMonth = calendar.month;

    const eventsByDay = new Map<string, Event[]>();

    monthEvents.forEach((event) => {
        const start = event.starts_on ?? event.starts_at.slice(0, 10);
        const rawEnd = event.ends_on ?? start;
        const end = rawEnd > calendar.grid_end ? calendar.grid_end : rawEnd;
        let day = start < calendar.grid_start ? calendar.grid_start : start;
        let steps = 0;

        while (day <= end && steps < 42) {
            const list = eventsByDay.get(day) ?? [];
            list.push(event);
            eventsByDay.set(day, list);

            day = addDays(day, 1);
            steps += 1;
        }
    });

    eventsByDay.forEach((list) => {
        list.sort((a, b) => {
            const byTime = (a.start_time ?? '').localeCompare(
                b.start_time ?? '',
            );

            return byTime !== 0 ? byTime : a.title.localeCompare(b.title);
        });
    });

    const selectedEvents = selectedDay
        ? (eventsByDay.get(selectedDay) ?? [])
        : [];

    const typeCounts = typeOptions.map((option) => ({
        ...option,
        count: monthEvents.filter((event) => event.type === option.value)
            .length,
    }));

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
                        <div className="flex flex-wrap items-center gap-2">
                            <ViewToggle
                                view={view}
                                onChange={(next) =>
                                    navigate({
                                        view:
                                            next === 'lista'
                                                ? 'lista'
                                                : undefined,
                                    })
                                }
                            />
                            <Button asChild>
                                <Link href={createEvent()}>
                                    <Plus className="size-4" />
                                    Nuevo evento
                                </Link>
                            </Button>
                        </div>
                    }
                />

                <ListFilters
                    url={calendarsIndex.url()}
                    search={filters.search}
                    searchPlaceholder="Buscar por título, tipo o descripción"
                    extraParams={extraParams}
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

                {view === 'calendario' ? (
                    <section
                        aria-label={`Calendario de ${calendar.label}`}
                        aria-busy={loading}
                        className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
                    >
                        <div className="flex flex-col gap-3 border-b border-border p-3 md:flex-row md:items-center md:justify-between">
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    aria-label="Mes anterior"
                                    onClick={() =>
                                        navigate({ month: calendar.previous })
                                    }
                                >
                                    <ChevronLeft className="size-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    aria-label="Mes siguiente"
                                    onClick={() =>
                                        navigate({ month: calendar.next })
                                    }
                                >
                                    <ChevronRight className="size-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        navigate({
                                            month: calendar.today.slice(0, 7),
                                        })
                                    }
                                >
                                    Hoy
                                </Button>
                                <h2 className="ml-1 text-base font-semibold text-foreground md:text-lg">
                                    {calendar.label}
                                </h2>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                    {calendar.timezone.replace(/_/g, ' ')}
                                </span>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <div className="min-w-[760px]">
                                <div className="grid grid-cols-7 border-b border-border bg-muted/30">
                                    {weekDays.map((day) => (
                                        <div
                                            key={day}
                                            className="px-2 py-2 text-center text-[11px] font-semibold tracking-wide text-muted-foreground uppercase"
                                        >
                                            {day}
                                        </div>
                                    ))}
                                </div>

                                {loading ? (
                                    <div className="grid grid-cols-7">
                                        {Array.from({ length: 42 }).map(
                                            (_, index) => (
                                                <div
                                                    key={`skeleton-${index}`}
                                                    className="min-h-[116px] border-r border-b border-border/70 p-2 [&:nth-child(7n)]:border-r-0 [&:nth-last-child(-n+7)]:border-b-0"
                                                >
                                                    <Skeleton className="size-6 rounded-full" />
                                                    <Skeleton className="mt-2 h-3 w-full" />
                                                    <Skeleton className="mt-1 h-3 w-4/5" />
                                                </div>
                                            ),
                                        )}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-7 [&>*:nth-child(7n)]:border-r-0 [&>*:nth-last-child(-n+7)]:border-b-0">
                                        {gridDays.map((day, index) => {
                                            const dayEvents =
                                                eventsByDay.get(day) ?? [];
                                            const visible = dayEvents.slice(
                                                0,
                                                3,
                                            );
                                            const hidden =
                                                dayEvents.length -
                                                visible.length;
                                            const outsideMonth =
                                                day.slice(0, 7) !==
                                                currentMonth;
                                            const isToday =
                                                day === calendar.today;
                                            const isWeekend = index % 7 >= 5;

                                            return (
                                                <div
                                                    key={day}
                                                    className={cn(
                                                        'group relative min-h-[116px] min-w-0 border-r border-b border-border/70 p-1.5 transition-colors hover:bg-muted/30',
                                                        outsideMonth &&
                                                            'bg-muted/20',
                                                        isWeekend &&
                                                            !outsideMonth &&
                                                            'bg-muted/10',
                                                        isToday &&
                                                            'bg-primary/[0.04]',
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between gap-1">
                                                        <span
                                                            className={cn(
                                                                'inline-flex size-6 items-center justify-center rounded-full text-xs font-medium text-muted-foreground',
                                                                outsideMonth &&
                                                                    'text-muted-foreground/60',
                                                                isToday &&
                                                                    'bg-primary font-semibold text-primary-foreground',
                                                            )}
                                                        >
                                                            {Number(
                                                                day.slice(
                                                                    8,
                                                                    10,
                                                                ),
                                                            )}
                                                        </span>
                                                        <Link
                                                            href={`${createEvent.url()}?starts_at=${day}T09%3A00`}
                                                            aria-label={`Crear evento el ${formatDate(day)}`}
                                                            className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                                        >
                                                            <Plus className="size-3.5" />
                                                        </Link>
                                                    </div>

                                                    <div className="mt-1 space-y-1">
                                                        {visible.map(
                                                            (event) => (
                                                                <Link
                                                                    key={`${event.id}-${day}`}
                                                                    href={showEvent(
                                                                        event.id,
                                                                    )}
                                                                    title={`${event.start_time ?? ''} ${event.title}${event.room ? ` · ${event.room.name}` : ''}`}
                                                                    className={cn(
                                                                        'block truncate rounded-md px-1.5 py-0.5 text-[11px] leading-4 font-medium transition-colors',
                                                                        typeChip(
                                                                            event.type,
                                                                        ),
                                                                        !event.active &&
                                                                            'line-through opacity-50',
                                                                    )}
                                                                >
                                                                    {event.starts_on ===
                                                                        event.ends_on &&
                                                                        event.start_time && (
                                                                            <span className="tabular-nums opacity-80">
                                                                                {
                                                                                    event.start_time
                                                                                }{' '}
                                                                            </span>
                                                                        )}
                                                                    {
                                                                        event.title
                                                                    }
                                                                </Link>
                                                            ),
                                                        )}

                                                        {hidden > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setSelectedDay(
                                                                        day,
                                                                    )
                                                                }
                                                                className="rounded-md px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                                                            >
                                                                +{hidden} más
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                            <span>
                                {monthEvents.length === 0
                                    ? hasFilters
                                        ? 'Ningún evento coincide con los filtros.'
                                        : 'Este mes no tiene eventos registrados.'
                                    : `${monthEvents.length} evento${monthEvents.length === 1 ? '' : 's'} en el mes`}
                            </span>
                            <div className="flex flex-wrap items-center gap-3">
                                {typeCounts.map((type) => (
                                    <span
                                        key={type.value}
                                        className="inline-flex items-center gap-1.5"
                                    >
                                        <span
                                            className={cn(
                                                'size-2 rounded-full',
                                                typeDot(type.value),
                                            )}
                                        />
                                        {type.label}: {type.count}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </section>
                ) : (
                    <DataTable
                        caption="Eventos del calendario"
                        columns={columns}
                        rows={events.data}
                        rowKey={(event) => event.id}
                        loading={loading}
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
                )}
            </div>

            <Dialog
                open={selectedDay !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedDay(null);
                    }
                }}
            >
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedDay
                                ? capitalize(formatDate(selectedDay))
                                : 'Eventos del día'}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedEvents.length} evento
                            {selectedEvents.length === 1 ? '' : 's'} en esta
                            fecha.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        {selectedEvents.map((event) => (
                            <Link
                                key={event.id}
                                href={showEvent(event.id)}
                                className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/40"
                            >
                                <span
                                    className={cn(
                                        'mt-1 size-2.5 shrink-0 rounded-full',
                                        typeDot(event.type),
                                    )}
                                />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium text-foreground">
                                        {event.title}
                                    </span>
                                    <span className="mt-0.5 block text-xs text-muted-foreground">
                                        {event.starts_on === event.ends_on
                                            ? `${event.start_time ?? ''}${event.end_time ? ` – ${event.end_time}` : ''}`
                                            : `${formatDate(event.starts_on)} – ${formatDate(event.ends_on)}`}
                                        {event.room
                                            ? ` · ${event.room.name}`
                                            : ''}
                                    </span>
                                </span>
                            </Link>
                        ))}
                    </div>

                    {selectedDay && (
                        <Button asChild variant="outline">
                            <Link
                                href={`${createEvent.url()}?starts_at=${selectedDay}T09%3A00`}
                            >
                                <CalendarPlus className="size-4" />
                                Crear evento este día
                            </Link>
                        </Button>
                    )}
                </DialogContent>
            </Dialog>

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
