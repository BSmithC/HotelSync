import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Banknote,
    BedDouble,
    CalendarCheck,
    CalendarClock,
    CircleDollarSign,
    DoorOpen,
    Gauge,
    LogIn,
    LogOut,
    Plus,
    ReceiptText,
    UserPlus,
    Users,
    Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ChartCard } from '@/components/chart-card';
import { DonutChart } from '@/components/charts/donut-chart';
import { ReservationTrendChart } from '@/components/charts/reservation-trend-chart';
import { RevenueAreaChart } from '@/components/charts/revenue-area-chart';
import { RoomDistributionChart } from '@/components/charts/room-distribution-chart';
import { DataTable } from '@/components/data-table';
import type { DataTableColumn } from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    formatCurrency,
    formatDate,
    formatDateTime,
    formatNumber,
} from '@/lib/format';
import { cn } from '@/lib/utils';
import {
    index as billsIndex,
    create as createBill,
    show as showBill,
} from '@/routes/bills';
import { index as calendarsIndex } from '@/routes/calendars';
import { create as createClient } from '@/routes/clients';
import {
    index as reservationsIndex,
    create as createReservation,
    show as showReservation,
} from '@/routes/reservations';
import { index as roomsIndex } from '@/routes/rooms';
import type {
    DashboardBill,
    DashboardProps,
    DashboardReservation,
    HotelSharedProps,
} from '@/types';

const statusStyles: Record<string, string> = {
    Pendiente: 'border-warning/25 bg-warning/10 text-warning',
    Confirmada: 'border-primary/25 bg-primary/10 text-primary',
    'En curso': 'border-chart-4/25 bg-chart-4/10 text-chart-4',
    Finalizada: 'border-success/25 bg-success/10 text-success',
    Cancelada: 'border-destructive/25 bg-destructive/10 text-destructive',
    Pagada: 'border-success/25 bg-success/10 text-success',
    Anulada: 'border-destructive/25 bg-destructive/10 text-destructive',
};

const statusColors: Record<string, string> = {
    Pendiente: 'var(--warning)',
    Confirmada: 'var(--primary)',
    'En curso': 'var(--chart-4)',
    Finalizada: 'var(--success)',
    Cancelada: 'var(--destructive)',
};

const formatPercent = (value: number) =>
    new Intl.NumberFormat('es-DO', { maximumFractionDigits: 1 }).format(value);

function StatusBadge({ status }: { status: string }) {
    return (
        <Badge
            variant="outline"
            className={cn(
                'rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                statusStyles[status] ??
                    'border-border bg-muted text-muted-foreground',
            )}
        >
            {status || 'Sin estado'}
        </Badge>
    );
}

/**
 * Builds a StatCard trend for a percentage change, or an honest hint when the
 * previous period has no billable data to compare against.
 */
function changeTrend(
    change: number | null,
    comparison: string,
): {
    trend?: {
        label: string;
        direction: 'up' | 'down' | 'flat';
        positive: boolean;
    };
    hint?: string;
} {
    if (change === null) {
        return { hint: `Sin base de comparación ${comparison}` };
    }

    return {
        trend: {
            label: `${formatPercent(Math.abs(change))}% ${comparison}`,
            direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat',
            positive: true,
        },
    };
}

const reservationColumns: DataTableColumn<DashboardReservation>[] = [
    {
        id: 'client',
        header: 'Huésped',
        cell: (reservation) => (
            <Link
                href={showReservation(reservation.id)}
                className="font-medium text-foreground transition-colors hover:text-primary"
            >
                {reservation.client}
            </Link>
        ),
    },
    {
        id: 'room',
        header: 'Habitación',
        cell: (reservation) => reservation.room,
    },
    {
        id: 'reservedAt',
        header: 'Entrada',
        cell: (reservation) => (
            <span className="text-muted-foreground">
                {formatDateTime(reservation.reservedAt)}
            </span>
        ),
    },
    {
        id: 'guests',
        header: 'Huéspedes',
        align: 'center',
        cell: (reservation) => formatNumber(reservation.guests),
    },
    {
        id: 'status',
        header: 'Estado',
        cell: (reservation) => <StatusBadge status={reservation.status} />,
    },
];

export default function Dashboard(props: DashboardProps) {
    const { currentHotel } = usePage<HotelSharedProps>().props;
    const {
        currency,
        timezone,
        generatedAt,
        kpis,
        revenueSeries,
        reservationTrend,
        reservationsByStatus,
        roomDistribution,
        recentReservations,
        upcomingCheckIns,
        upcomingCheckOuts,
        recentBills,
    } = props;

    const todayTrend = changeTrend(kpis.revenueTodayChange, 'vs. ayer');
    const monthTrend = changeTrend(kpis.revenueMonthChange, 'vs. mes anterior');

    const reservationSegments = reservationsByStatus.map((item) => ({
        label: item.status,
        value: item.count,
        color: statusColors[item.status] ?? 'var(--muted-foreground)',
    }));

    const roomSegments = [
        {
            label: 'Disponibles',
            value: kpis.availableRooms,
            color: 'var(--success)',
        },
        {
            label: 'Ocupadas',
            value: kpis.occupiedRooms,
            color: 'var(--primary)',
        },
        {
            label: 'Reservadas',
            value: kpis.reservedRooms,
            color: 'var(--warning)',
        },
        {
            label: 'Mantenimiento',
            value: kpis.maintenanceRooms,
            color: 'var(--muted-foreground)',
        },
    ];

    return (
        <>
            <Head title="Dashboard" />

            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <PageHeader
                    title="Dashboard"
                    description={
                        currentHotel
                            ? `Resumen operativo de ${currentHotel.name}.`
                            : 'Resumen operativo del hotel activo.'
                    }
                    actions={
                        <>
                            <Button variant="outline" asChild>
                                <Link href={createClient()}>
                                    <UserPlus className="size-4" />
                                    Registrar huésped
                                </Link>
                            </Button>
                            <Button asChild>
                                <Link href={createReservation()}>
                                    <Plus className="size-4" />
                                    Nueva reservación
                                </Link>
                            </Button>
                        </>
                    }
                >
                    <p className="text-xs text-muted-foreground">
                        Actualizado el {formatDateTime(generatedAt)} · Zona
                        horaria {timezone}
                    </p>
                </PageHeader>

                <section
                    aria-label="Indicadores principales"
                    className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
                >
                    <StatCard
                        label="Facturado hoy"
                        value={formatCurrency(kpis.revenueToday, currency)}
                        icon={Banknote}
                        tone="primary"
                        trend={todayTrend.trend}
                        hint={todayTrend.hint}
                    />
                    <StatCard
                        label="Cobrado hoy"
                        value={formatCurrency(kpis.paidToday, currency)}
                        icon={Wallet}
                        tone="success"
                        hint="Facturas pagadas emitidas hoy"
                    />
                    <StatCard
                        label="Facturado este mes"
                        value={formatCurrency(kpis.revenueMonth, currency)}
                        icon={ReceiptText}
                        tone="primary"
                        trend={monthTrend.trend}
                        hint={monthTrend.hint}
                    />
                    <StatCard
                        label="Cobrado este mes"
                        value={formatCurrency(kpis.paidMonth, currency)}
                        icon={CircleDollarSign}
                        tone="success"
                        hint="Facturas pagadas del mes en curso"
                    />
                    <StatCard
                        label="Ocupación actual"
                        value={`${formatPercent(kpis.occupancyRate)}%`}
                        icon={Gauge}
                        tone="warning"
                        hint={`${formatNumber(kpis.occupiedRooms)} de ${formatNumber(
                            kpis.totalRooms,
                        )} habitaciones ocupadas`}
                    />
                    <StatCard
                        label="Habitaciones disponibles"
                        value={formatNumber(kpis.availableRooms)}
                        icon={DoorOpen}
                        tone="success"
                        hint={`${formatNumber(kpis.reservedRooms)} reservadas · ${formatNumber(
                            kpis.maintenanceRooms,
                        )} en mantenimiento`}
                    />
                    <StatCard
                        label="Reservas activas"
                        value={formatNumber(kpis.activeReservations)}
                        icon={CalendarCheck}
                        tone="primary"
                        hint={`${formatNumber(kpis.pendingReservations)} pendientes de confirmar`}
                    />
                    <StatCard
                        label="Huéspedes en casa"
                        value={formatNumber(kpis.inHouseGuests)}
                        icon={Users}
                        tone="warning"
                        hint={`${formatNumber(kpis.inHouseReservations)} reservas en curso`}
                    />
                </section>

                <section className="grid gap-4 xl:grid-cols-3">
                    <ChartCard
                        title="Ingresos de los últimos 30 días"
                        description="Facturado frente a cobrado, por día."
                        className="xl:col-span-2"
                    >
                        <RevenueAreaChart
                            data={revenueSeries}
                            currency={currency}
                        />
                    </ChartCard>

                    <ChartCard
                        title="Reservaciones por estado"
                        description="Reservas activas registradas en el hotel."
                    >
                        <DonutChart
                            segments={reservationSegments}
                            unitLabel="reservas"
                            emptyTitle="Sin reservaciones activas"
                            emptyDescription="Crea una reservación para ver la distribución por estado."
                        />
                    </ChartCard>
                </section>

                <section className="grid gap-4 xl:grid-cols-3">
                    <ChartCard
                        title="Reservaciones de los últimos 14 días"
                        description="Reservas creadas por día."
                        className="xl:col-span-2"
                    >
                        <ReservationTrendChart data={reservationTrend} />
                    </ChartCard>

                    <ChartCard
                        title="Estado de habitaciones"
                        description="Foto actual de las habitaciones activas."
                    >
                        <DonutChart
                            segments={roomSegments}
                            unitLabel="habitaciones"
                            emptyTitle="Sin habitaciones activas"
                            emptyDescription="Crea habitaciones para ver su estado actual."
                        />
                    </ChartCard>
                </section>

                <section className="grid gap-4 xl:grid-cols-3">
                    <ChartCard
                        title="Habitaciones por área"
                        description="Distribución de habitaciones activas."
                        className="xl:col-span-2"
                    >
                        <RoomDistributionChart data={roomDistribution} />
                    </ChartCard>

                    <Card className="shadow-xs">
                        <CardContent className="flex h-full flex-col p-5">
                            <div className="space-y-1">
                                <h2 className="text-sm font-semibold text-foreground">
                                    Accesos rápidos
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Solo módulos disponibles en el sistema.
                                </p>
                            </div>

                            <div className="mt-4 flex flex-1 flex-col gap-1.5">
                                <QuickAction
                                    href={createReservation()}
                                    icon={CalendarCheck}
                                    label="Crear reservación"
                                />
                                <QuickAction
                                    href={createClient()}
                                    icon={Users}
                                    label="Registrar huésped"
                                />
                                <QuickAction
                                    href={createBill()}
                                    icon={CircleDollarSign}
                                    label="Emitir factura"
                                />
                                <QuickAction
                                    href={roomsIndex()}
                                    icon={BedDouble}
                                    label="Ver habitaciones"
                                />
                                <QuickAction
                                    href={calendarsIndex()}
                                    icon={CalendarClock}
                                    label="Ver calendario"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </section>

                <section className="grid gap-4 xl:grid-cols-3">
                    <ChartCard
                        title="Próximos check-in"
                        description="Entradas programadas desde hoy."
                        contentClassName="p-0 pt-4"
                    >
                        <ReservationList
                            items={upcomingCheckIns}
                            dateKey="reservedAt"
                            icon={LogIn}
                            emptyTitle="Sin check-in programados"
                            emptyDescription="No hay reservas activas con entrada a partir de hoy."
                        />
                    </ChartCard>

                    <ChartCard
                        title="Próximas salidas"
                        description="Reservas en curso con salida pendiente."
                        contentClassName="p-0 pt-4"
                    >
                        <ReservationList
                            items={upcomingCheckOuts}
                            dateKey="finishedAt"
                            icon={LogOut}
                            emptyTitle="Sin salidas pendientes"
                            emptyDescription="No hay reservas en curso con fecha de salida futura."
                        />
                    </ChartCard>

                    <ChartCard
                        title="Facturación reciente"
                        description="Últimas facturas emitidas."
                        contentClassName="p-0 pt-4"
                        actions={
                            <Button variant="ghost" size="sm" asChild>
                                <Link href={billsIndex()}>
                                    Ver todas
                                    <ArrowRight className="size-4" />
                                </Link>
                            </Button>
                        }
                    >
                        <BillList bills={recentBills} currency={currency} />
                    </ChartCard>
                </section>

                <section className="space-y-3">
                    <div className="flex flex-wrap items-end justify-between gap-2">
                        <div className="space-y-1">
                            <h2 className="text-sm font-semibold text-foreground">
                                Reservaciones recientes
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                Las últimas reservas registradas en el hotel.
                            </p>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                            <Link href={reservationsIndex()}>
                                Ver todas
                                <ArrowRight className="size-4" />
                            </Link>
                        </Button>
                    </div>

                    <DataTable
                        columns={reservationColumns}
                        rows={recentReservations}
                        rowKey={(reservation) => reservation.id}
                        caption="Reservaciones recientes"
                        empty={
                            <EmptyState
                                icon={CalendarCheck}
                                title="Todavía no hay reservaciones"
                                description="Crea la primera reservación para empezar a ver actividad en el dashboard."
                                action={
                                    <Button asChild>
                                        <Link href={createReservation()}>
                                            <Plus className="size-4" />
                                            Nueva reservación
                                        </Link>
                                    </Button>
                                }
                            />
                        }
                    />
                </section>
            </div>
        </>
    );
}

/**
 * Renders an upcoming reservation list with a link to the reservation detail.
 */
function ReservationList({
    items,
    dateKey,
    icon: Icon,
    emptyTitle,
    emptyDescription,
}: {
    items: DashboardReservation[];
    dateKey: 'reservedAt' | 'finishedAt';
    icon: LucideIcon;
    emptyTitle: string;
    emptyDescription: string;
}) {
    if (items.length === 0) {
        return (
            <EmptyState
                icon={Icon}
                title={emptyTitle}
                description={emptyDescription}
                className="py-8"
            />
        );
    }

    return (
        <ul className="divide-y divide-border border-t border-border">
            {items.map((reservation) => (
                <li key={reservation.id}>
                    <Link
                        href={showReservation(reservation.id)}
                        className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
                    >
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Icon className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                                {reservation.client}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                                {reservation.room} ·{' '}
                                {formatDateTime(reservation[dateKey])}
                            </p>
                        </div>
                        <StatusBadge status={reservation.status} />
                    </Link>
                </li>
            ))}
        </ul>
    );
}

function BillList({
    bills,
    currency,
}: {
    bills: DashboardBill[];
    currency: string;
}) {
    if (bills.length === 0) {
        return (
            <EmptyState
                icon={ReceiptText}
                title="Sin facturas emitidas"
                description="Las facturas aparecerán aquí en cuanto se emitan."
                className="py-8"
            />
        );
    }

    return (
        <ul className="divide-y divide-border border-t border-border">
            {bills.map((bill) => (
                <li key={bill.id}>
                    <Link
                        href={showBill(bill.id)}
                        className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
                    >
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                            <ReceiptText className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                                {bill.number || `Factura #${bill.id}`}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                                {bill.client} · {formatDate(bill.issuedAt)}
                            </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                            <span className="text-sm font-semibold text-foreground">
                                {formatCurrency(bill.total, currency)}
                            </span>
                            <StatusBadge status={bill.status} />
                        </div>
                    </Link>
                </li>
            ))}
        </ul>
    );
}

function QuickAction({
    href,
    icon: Icon,
    label,
}: {
    href: ReturnType<typeof billsIndex>;
    icon: LucideIcon;
    label: string;
}) {
    return (
        <Link
            href={href}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
            <Icon className="size-4 shrink-0 text-primary" />
            <span className="flex-1">{label}</span>
            <ArrowRight className="size-3.5" />
        </Link>
    );
}
