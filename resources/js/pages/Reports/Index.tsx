import { Head, router } from '@inertiajs/react';
import {
    Banknote,
    BedDouble,
    CalendarCheck,
    CircleDollarSign,
    Download,
    HandCoins,
    Package,
    Printer,
    ReceiptText,
    Scale,
    Sparkles,
    Users,
    Wallet,
} from 'lucide-react';
import { ChartCard } from '@/components/chart-card';
import { DataTable } from '@/components/data-table';
import type { DataTableColumn } from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { ListFilters } from '@/components/list-filters';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { ReportOccupancyChart } from '@/components/reports/report-occupancy-chart';
import { ReportPerformanceChart } from '@/components/reports/report-performance-chart';
import { StatCard } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    expenseCategoryLabels,
    financeStatusLabels,
    labelFor,
    paymentMethodLabels,
} from '@/lib/finance-labels';
import {
    formatCurrency,
    formatDate,
    formatDateTime,
    formatNumber,
} from '@/lib/format';
import {
    inventoryMovementStateLabels,
    inventoryMovementTypeLabels,
    inventoryLabel,
} from '@/lib/inventory-labels';
import {
    serviceCategoryLabels,
    serviceLabel,
    serviceRequestStatusLabels,
} from '@/lib/service-labels';
import { cn } from '@/lib/utils';
import {
    exportMethod as reportsExport,
    index as reportsIndex,
} from '@/routes/reports';
import type {
    ReportFinanceRow,
    ReportInventoryRow,
    ReportOperationRow,
    ReportServiceRow,
    ReportTab,
    ReportsIndexProps,
} from '@/types';

function trend(
    change: number | null,
    positiveWhenUp = true,
): {
    label: string;
    direction: 'up' | 'down' | 'flat';
    positive: boolean;
} | null {
    if (change === null) {
        return null;
    }

    const direction = change === 0 ? 'flat' : change > 0 ? 'up' : 'down';

    return {
        label: `${change > 0 ? '+' : ''}${change.toFixed(1)}% vs período anterior`,
        direction,
        positive: positiveWhenUp ? change >= 0 : change <= 0,
    };
}

const directionStyles: Record<string, string> = {
    ingreso:
        'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    egreso: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
};

const inventoryStateStyles: Record<string, string> = {
    vigente:
        'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    reverso: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
    anulado: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
};

function DirectionBadge({ direction }: { direction: string }) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                directionStyles[direction] ?? 'bg-muted text-muted-foreground',
            )}
        >
            {labelFor(financeStatusLabels, direction)}
        </span>
    );
}

function InventoryStateBadge({ state }: { state: string }) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                inventoryStateStyles[state] ?? 'bg-muted text-muted-foreground',
            )}
        >
            {inventoryLabel(inventoryMovementStateLabels, state)}
        </span>
    );
}

function ServiceStatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        pendiente:
            'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
        en_proceso:
            'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
        completado:
            'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
        facturado:
            'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300',
        anulado: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                styles[status] ?? 'bg-muted text-muted-foreground',
            )}
        >
            {serviceLabel(serviceRequestStatusLabels, status)}
        </span>
    );
}

function BreakdownRow({
    label,
    value,
    max,
    hint,
    tone = 'primary',
}: {
    label: string;
    value: number;
    max: number;
    hint: string;
    tone?: 'primary' | 'success' | 'danger';
}) {
    const width = max > 0 ? Math.max(4, (value / max) * 100) : 0;

    const barTone = {
        primary: 'bg-primary',
        success: 'bg-success',
        danger: 'bg-destructive',
    } as const;

    return (
        <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
                <p className="truncate text-sm text-foreground">{label}</p>
                <p className="shrink-0 text-sm font-semibold text-foreground">
                    {hint}
                </p>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                    className={cn('h-full rounded-full', barTone[tone])}
                    style={{ width: `${width}%` }}
                />
            </div>
        </div>
    );
}

export default function Index({
    currency,
    timezone,
    generatedAt,
    period,
    kpis,
    previous,
    series,
    expensesByCategory,
    revenueByMethod,
    reservationsByStatus,
    topServices,
    lowStock,
    detail,
    counts,
    filters,
    permissions,
}: ReportsIndexProps) {
    const tab = filters.tab;

    const visit = (params: Record<string, string>) => {
        const query: Record<string, string> = {
            ...filters,
            ...params,
        };

        Object.keys(query).forEach((key) => {
            if (query[key] === '') {
                delete query[key];
            }
        });

        router.get(reportsIndex.url(), query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const changeTab = (next: ReportTab) =>
        visit({ tab: next, detail_page: '' });

    const preset = (value: string) =>
        visit({ preset: value, from: '', to: '', detail_page: '' });

    const exportUrl = reportsExport.url({
        query: {
            from: filters.from,
            to: filters.to,
            type: tab,
        },
    });

    const tabs: { id: ReportTab; label: string; count?: number }[] = [
        { id: 'resumen', label: 'Resumen' },
        { id: 'finanzas', label: 'Finanzas', count: counts.finanzas },
        { id: 'operacion', label: 'Operación', count: counts.operacion },
        { id: 'servicios', label: 'Servicios', count: counts.servicios },
        { id: 'inventario', label: 'Inventario', count: counts.inventario },
    ];

    const comparison: {
        label: string;
        current: number;
        previous: number;
        change: number | null;
        format: (value: number) => string;
    }[] = [
        {
            label: 'Facturado',
            current: kpis.invoiced,
            previous: previous.invoiced,
            change: kpis.change.invoiced,
            format: (value) => formatCurrency(value, currency),
        },
        {
            label: 'Cobrado',
            current: kpis.collected,
            previous: previous.collected,
            change: kpis.change.collected,
            format: (value) => formatCurrency(value, currency),
        },
        {
            label: 'Gastos',
            current: kpis.expenses,
            previous: previous.expenses,
            change: kpis.change.expenses,
            format: (value) => formatCurrency(value, currency),
        },
        {
            label: 'Flujo neto',
            current: kpis.net,
            previous: previous.net,
            change: kpis.change.net,
            format: (value) => formatCurrency(value, currency),
        },
        {
            label: 'Ocupación',
            current: kpis.occupancyRate,
            previous: previous.occupancyRate,
            change: kpis.change.occupancy,
            format: (value) => `${formatNumber(value)}%`,
        },
    ];

    const maxExpense = Math.max(
        0,
        ...expensesByCategory.map((row) => row.amount),
    );
    const maxMethod = Math.max(0, ...revenueByMethod.map((row) => row.amount));

    const financeColumns: DataTableColumn<ReportFinanceRow>[] = [
        {
            id: 'date',
            header: 'Fecha',
            cell: (row) => formatDate(row.date),
        },
        {
            id: 'direction',
            header: 'Dirección',
            cell: (row) => <DirectionBadge direction={row.direction} />,
        },
        {
            id: 'amount',
            header: 'Monto',
            align: 'right',
            cell: (row) => (
                <span
                    className={cn(
                        'font-medium',
                        row.direction === 'ingreso'
                            ? 'text-success'
                            : 'text-destructive',
                    )}
                >
                    {formatCurrency(row.amount, currency)}
                </span>
            ),
        },
        {
            id: 'description',
            header: 'Descripción',
            cell: (row) => (
                <div className="min-w-0">
                    <p className="max-w-md truncate text-foreground">
                        {row.description ?? 'Sin descripción'}
                    </p>
                    {row.reversalOfId && (
                        <p className="text-xs text-muted-foreground">
                            Reversa del movimiento #{row.reversalOfId}
                        </p>
                    )}
                </div>
            ),
        },
        {
            id: 'createdBy',
            header: 'Registrado por',
            cell: (row) => (
                <span className="text-sm text-muted-foreground">
                    {row.createdBy ?? '—'}
                </span>
            ),
        },
    ];

    const operationColumns: DataTableColumn<ReportOperationRow>[] = [
        {
            id: 'client',
            header: 'Huésped',
            cell: (row) => (
                <div className="min-w-0">
                    <p className="font-medium text-foreground">{row.client}</p>
                    <p className="truncate text-xs text-muted-foreground">
                        {row.room}
                    </p>
                </div>
            ),
        },
        {
            id: 'arrival',
            header: 'Llegada',
            cell: (row) => formatDate(row.arrival),
        },
        {
            id: 'departure',
            header: 'Salida',
            cell: (row) => formatDate(row.departure),
        },
        {
            id: 'nights',
            header: 'Noches',
            align: 'center',
            cell: (row) => formatNumber(row.nights),
        },
        {
            id: 'guests',
            header: 'Huéspedes',
            align: 'center',
            cell: (row) => formatNumber(row.guests),
        },
        {
            id: 'status',
            header: 'Estado',
            cell: (row) => <StatusBadge status={row.status} />,
        },
    ];

    const serviceColumns: DataTableColumn<ReportServiceRow>[] = [
        {
            id: 'service',
            header: 'Servicio',
            cell: (row) => (
                <div className="min-w-0">
                    <p className="font-medium text-foreground">{row.service}</p>
                    <p className="truncate text-xs text-muted-foreground">
                        {serviceLabel(serviceCategoryLabels, row.category)}
                    </p>
                </div>
            ),
        },
        {
            id: 'client',
            header: 'Cliente',
            cell: (row) => (
                <span className="text-sm text-muted-foreground">
                    {row.client ?? 'Sin cliente'}
                </span>
            ),
        },
        {
            id: 'requestedAt',
            header: 'Solicitado',
            cell: (row) => formatDate(row.requestedAt),
        },
        {
            id: 'quantity',
            header: 'Cantidad',
            align: 'center',
            cell: (row) => formatNumber(row.quantity),
        },
        {
            id: 'total',
            header: 'Total',
            align: 'right',
            cell: (row) => formatCurrency(row.total, currency),
        },
        {
            id: 'status',
            header: 'Estado',
            cell: (row) => <ServiceStatusBadge status={row.status} />,
        },
    ];

    const inventoryColumns: DataTableColumn<ReportInventoryRow>[] = [
        {
            id: 'item',
            header: 'Artículo',
            cell: (row) => (
                <div className="min-w-0">
                    <p className="font-medium text-foreground">{row.item}</p>
                    <p className="truncate text-xs text-muted-foreground">
                        {row.sku ?? 'Sin SKU'}
                    </p>
                </div>
            ),
        },
        {
            id: 'type',
            header: 'Tipo',
            cell: (row) =>
                inventoryLabel(inventoryMovementTypeLabels, row.type),
        },
        {
            id: 'date',
            header: 'Fecha',
            cell: (row) => formatDate(row.date),
        },
        {
            id: 'quantity',
            header: 'Cantidad',
            align: 'right',
            cell: (row) => (
                <span
                    className={cn(
                        'font-medium',
                        row.quantity >= 0 ? 'text-success' : 'text-destructive',
                    )}
                >
                    {row.quantity > 0 ? '+' : ''}
                    {formatNumber(row.quantity)}
                </span>
            ),
        },
        {
            id: 'reason',
            header: 'Motivo',
            cell: (row) => (
                <div className="min-w-0">
                    <p className="max-w-sm truncate text-foreground">
                        {row.reason ?? 'Sin motivo'}
                    </p>
                    {row.reference && (
                        <p className="truncate text-xs text-muted-foreground">
                            Ref. {row.reference}
                        </p>
                    )}
                </div>
            ),
        },
        {
            id: 'state',
            header: 'Estado',
            cell: (row) => <InventoryStateBadge state={row.state} />,
        },
    ];

    const detailRows = detail?.data ?? [];

    return (
        <>
            <Head title="Reportes" />

            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6 print:p-0">
                <PageHeader
                    title="Reportes"
                    description="Indicadores consolidados del hotel: finanzas, operación, servicios e inventario."
                    actions={
                        <div className="flex flex-wrap items-center gap-2 print:hidden">
                            {permissions.export && (
                                <Button asChild variant="outline">
                                    <a href={exportUrl}>
                                        <Download className="size-4" />
                                        Exportar CSV
                                    </a>
                                </Button>
                            )}
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => window.print()}
                            >
                                <Printer className="size-4" />
                                Imprimir
                            </Button>
                        </div>
                    }
                />

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between print:hidden">
                    <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card p-1.5">
                        {[
                            { id: 'mes', label: 'Este mes' },
                            { id: 'mes_anterior', label: 'Mes anterior' },
                            { id: '30', label: 'Últimos 30 días' },
                            { id: 'anio', label: 'Este año' },
                        ].map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => preset(item.id)}
                                className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Input
                            type="date"
                            value={filters.from}
                            onChange={(event) =>
                                visit({
                                    from: event.target.value,
                                    detail_page: '',
                                })
                            }
                            aria-label="Desde"
                            className="w-auto max-w-full"
                        />
                        <span className="text-xs text-muted-foreground">
                            al
                        </span>
                        <Input
                            type="date"
                            value={filters.to}
                            onChange={(event) =>
                                visit({
                                    to: event.target.value,
                                    detail_page: '',
                                })
                            }
                            aria-label="Hasta"
                            className="w-auto max-w-full"
                        />
                    </div>
                </div>

                <p className="text-xs text-muted-foreground">
                    Del {formatDate(period.from)} al {formatDate(period.to)} ·{' '}
                    {period.days} días · Zona horaria {timezone} · Generado el{' '}
                    {formatDateTime(generatedAt)}
                </p>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                    <StatCard
                        label="Facturado"
                        value={formatCurrency(kpis.invoiced, currency)}
                        hint={`${formatNumber(kpis.invoicedCount)} facturas`}
                        icon={ReceiptText}
                        tone="primary"
                        trend={trend(kpis.change.invoiced) ?? undefined}
                    />
                    <StatCard
                        label="Cobrado"
                        value={formatCurrency(kpis.collected, currency)}
                        hint={`${formatNumber(kpis.collectedCount)} cobros`}
                        icon={Banknote}
                        tone="success"
                        trend={trend(kpis.change.collected) ?? undefined}
                    />
                    <StatCard
                        label="Gastos"
                        value={formatCurrency(kpis.expenses, currency)}
                        hint={`${formatNumber(kpis.expensesCount)} gastos`}
                        icon={Wallet}
                        tone="danger"
                        trend={trend(kpis.change.expenses, false) ?? undefined}
                    />
                    <StatCard
                        label="Flujo neto"
                        value={formatCurrency(kpis.net, currency)}
                        hint="Cobrado menos gastos"
                        icon={Scale}
                        tone="warning"
                        trend={trend(kpis.change.net) ?? undefined}
                    />
                    <StatCard
                        label="Por cobrar"
                        value={formatCurrency(kpis.pending, currency)}
                        hint={`Saldo al ${formatDate(period.to)}`}
                        icon={CircleDollarSign}
                        tone="danger"
                    />
                    <StatCard
                        label="Ocupación"
                        value={`${formatNumber(kpis.occupancyRate)}%`}
                        hint={`${formatNumber(kpis.roomNights)} noches / ${formatNumber(
                            kpis.activeRooms,
                        )} habitaciones`}
                        icon={BedDouble}
                        tone="primary"
                        trend={trend(kpis.change.occupancy) ?? undefined}
                    />
                </div>

                <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1.5 print:hidden">
                    {tabs.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => changeTab(item.id)}
                            className={cn(
                                'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                tab === item.id
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                            )}
                        >
                            {item.label}
                            {typeof item.count === 'number' && (
                                <span
                                    className={cn(
                                        'rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
                                        tab === item.id
                                            ? 'bg-white/20 text-primary-foreground'
                                            : 'bg-muted text-muted-foreground',
                                    )}
                                >
                                    {formatNumber(item.count)}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {tab === 'resumen' && (
                    <div className="space-y-4">
                        <div className="grid gap-4 xl:grid-cols-3">
                            <ChartCard
                                title="Evolución de ingresos y gastos"
                                description="Facturado, cobrado y gastos por día del período seleccionado."
                                className="xl:col-span-2"
                            >
                                <ReportPerformanceChart
                                    data={series}
                                    currency={currency}
                                />
                            </ChartCard>

                            <Card className="shadow-xs">
                                <CardContent className="space-y-4 p-5">
                                    <div>
                                        <h2 className="text-sm font-semibold text-foreground">
                                            Comparativo del período
                                        </h2>
                                        <p className="text-xs text-muted-foreground">
                                            {period.days} días frente al{' '}
                                            {formatDate(period.previousFrom)} –{' '}
                                            {formatDate(period.previousTo)}.
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        {comparison.map((row) => {
                                            const rowTrend = trend(row.change);

                                            return (
                                                <div
                                                    key={row.label}
                                                    className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="text-sm text-muted-foreground">
                                                            {row.label}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Anterior:{' '}
                                                            {row.format(
                                                                row.previous,
                                                            )}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-semibold text-foreground">
                                                            {row.format(
                                                                row.current,
                                                            )}
                                                        </p>
                                                        {rowTrend ? (
                                                            <p
                                                                className={cn(
                                                                    'text-xs font-medium',
                                                                    rowTrend.direction ===
                                                                        'flat'
                                                                        ? 'text-muted-foreground'
                                                                        : rowTrend.positive
                                                                          ? 'text-success'
                                                                          : 'text-destructive',
                                                                )}
                                                            >
                                                                {rowTrend.label}
                                                            </p>
                                                        ) : (
                                                            <p className="text-xs text-muted-foreground">
                                                                Sin base
                                                                anterior
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="grid grid-cols-3 gap-3 border-t border-border pt-3">
                                        <div>
                                            <p className="text-xs text-muted-foreground">
                                                Reservas
                                            </p>
                                            <p className="text-sm font-semibold text-foreground">
                                                {formatNumber(
                                                    kpis.reservations,
                                                )}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">
                                                Huéspedes
                                            </p>
                                            <p className="text-sm font-semibold text-foreground">
                                                {formatNumber(kpis.guests)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">
                                                Ticket medio
                                            </p>
                                            <p className="text-sm font-semibold text-foreground">
                                                {formatCurrency(
                                                    kpis.averageTicket,
                                                    currency,
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-3">
                            <ChartCard
                                title="Ocupación diaria"
                                description="Porcentaje de habitaciones ocupadas por reservas activas."
                                className="lg:col-span-2"
                            >
                                <ReportOccupancyChart data={series} />
                            </ChartCard>

                            <Card className="shadow-xs">
                                <CardContent className="space-y-4 p-5">
                                    <div>
                                        <h2 className="text-sm font-semibold text-foreground">
                                            Reservas por estado
                                        </h2>
                                        <p className="text-xs text-muted-foreground">
                                            Reservas que solapan el período.
                                        </p>
                                    </div>

                                    <div className="space-y-2.5">
                                        {reservationsByStatus.map((row) => (
                                            <div
                                                key={row.status}
                                                className="flex items-center justify-between gap-3"
                                            >
                                                <StatusBadge
                                                    status={row.status}
                                                />
                                                <span className="text-sm font-semibold text-foreground">
                                                    {formatNumber(row.count)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
                                        <span className="text-muted-foreground">
                                            Habitaciones-noche
                                        </span>
                                        <span className="font-semibold text-foreground">
                                            {formatNumber(kpis.roomNights)}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-3">
                            <Card className="shadow-xs">
                                <CardContent className="space-y-4 p-5">
                                    <div>
                                        <h2 className="text-sm font-semibold text-foreground">
                                            Gastos por categoría
                                        </h2>
                                        <p className="text-xs text-muted-foreground">
                                            Solo gastos registrados.
                                        </p>
                                    </div>

                                    {expensesByCategory.length === 0 ? (
                                        <EmptyState
                                            icon={Wallet}
                                            title="Sin gastos"
                                            description="No hay gastos registrados en el período."
                                        />
                                    ) : (
                                        <div className="space-y-3">
                                            {expensesByCategory.map((row) => (
                                                <BreakdownRow
                                                    key={row.category}
                                                    label={labelFor(
                                                        expenseCategoryLabels,
                                                        row.category,
                                                    )}
                                                    value={row.amount}
                                                    max={maxExpense}
                                                    hint={formatCurrency(
                                                        row.amount,
                                                        currency,
                                                    )}
                                                    tone="danger"
                                                />
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="shadow-xs">
                                <CardContent className="space-y-4 p-5">
                                    <div>
                                        <h2 className="text-sm font-semibold text-foreground">
                                            Cobros por método
                                        </h2>
                                        <p className="text-xs text-muted-foreground">
                                            Cobros registrados en el período.
                                        </p>
                                    </div>

                                    {revenueByMethod.length === 0 ? (
                                        <EmptyState
                                            icon={HandCoins}
                                            title="Sin cobros"
                                            description="No hay cobros registrados en el período."
                                        />
                                    ) : (
                                        <div className="space-y-3">
                                            {revenueByMethod.map((row) => (
                                                <BreakdownRow
                                                    key={row.method}
                                                    label={labelFor(
                                                        paymentMethodLabels,
                                                        row.method,
                                                    )}
                                                    value={row.amount}
                                                    max={maxMethod}
                                                    hint={formatCurrency(
                                                        row.amount,
                                                        currency,
                                                    )}
                                                    tone="success"
                                                />
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="shadow-xs">
                                <CardContent className="space-y-4 p-5">
                                    <div>
                                        <h2 className="text-sm font-semibold text-foreground">
                                            Stock bajo
                                        </h2>
                                        <p className="text-xs text-muted-foreground">
                                            Artículos en o por debajo del
                                            mínimo.
                                        </p>
                                    </div>

                                    {lowStock.length === 0 ? (
                                        <EmptyState
                                            icon={Package}
                                            title="Stock saludable"
                                            description="Ningún artículo está por debajo del mínimo."
                                        />
                                    ) : (
                                        <div className="space-y-3">
                                            {lowStock.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="flex items-center justify-between gap-3"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm text-foreground">
                                                            {item.name}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {item.sku ??
                                                                'Sin SKU'}{' '}
                                                            · mínimo{' '}
                                                            {formatNumber(
                                                                item.minStock,
                                                            )}
                                                        </p>
                                                    </div>
                                                    <span className="shrink-0 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                                                        {formatNumber(
                                                            item.stock,
                                                        )}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <ChartCard
                            title="Servicios más solicitados"
                            description="Solicitudes no anuladas del período, ordenadas por monto."
                        >
                            <DataTable
                                caption="Servicios más solicitados"
                                columns={[
                                    {
                                        id: 'service',
                                        header: 'Servicio',
                                        cell: (row) => row.service,
                                    },
                                    {
                                        id: 'quantity',
                                        header: 'Cantidad',
                                        align: 'center',
                                        cell: (row) =>
                                            formatNumber(row.quantity),
                                    },
                                    {
                                        id: 'total',
                                        header: 'Monto',
                                        align: 'right',
                                        cell: (row) =>
                                            formatCurrency(row.total, currency),
                                    },
                                ]}
                                rows={topServices}
                                rowKey={(row) => row.service}
                                empty={
                                    <EmptyState
                                        icon={Sparkles}
                                        title="Sin servicios solicitados"
                                        description="Las solicitudes del período aparecerán aquí."
                                    />
                                }
                            />
                        </ChartCard>
                    </div>
                )}

                {tab !== 'resumen' && (
                    <div className="space-y-3">
                        <ListFilters
                            url={reportsIndex.url()}
                            search={filters.search}
                            searchPlaceholder="Buscar en el detalle…"
                            extraParams={{
                                from: filters.from,
                                to: filters.to,
                                tab,
                            }}
                        />

                        {tab === 'finanzas' && (
                            <>
                                <DataTable
                                    caption="Movimientos financieros del período"
                                    columns={financeColumns}
                                    rows={detailRows as ReportFinanceRow[]}
                                    rowKey={(row) => row.id}
                                    empty={
                                        <EmptyState
                                            icon={HandCoins}
                                            title="Sin movimientos financieros"
                                            description="Ajusta las fechas para consultar otro período."
                                        />
                                    }
                                />
                                {detail && <Pagination meta={detail} />}
                            </>
                        )}

                        {tab === 'operacion' && (
                            <>
                                <DataTable
                                    caption="Reservas del período"
                                    columns={operationColumns}
                                    rows={detailRows as ReportOperationRow[]}
                                    rowKey={(row) => row.id}
                                    empty={
                                        <EmptyState
                                            icon={CalendarCheck}
                                            title="Sin reservas en el período"
                                            description="Las reservas activas que solapan el período aparecerán aquí."
                                        />
                                    }
                                />
                                {detail && <Pagination meta={detail} />}
                            </>
                        )}

                        {tab === 'servicios' && (
                            <>
                                <DataTable
                                    caption="Solicitudes de servicio del período"
                                    columns={serviceColumns}
                                    rows={detailRows as ReportServiceRow[]}
                                    rowKey={(row) => row.id}
                                    empty={
                                        <EmptyState
                                            icon={Sparkles}
                                            title="Sin solicitudes de servicio"
                                            description="Ajusta las fechas para consultar otro período."
                                        />
                                    }
                                />
                                {detail && <Pagination meta={detail} />}
                            </>
                        )}

                        {tab === 'inventario' && (
                            <>
                                <DataTable
                                    caption="Movimientos de inventario del período"
                                    columns={inventoryColumns}
                                    rows={detailRows as ReportInventoryRow[]}
                                    rowKey={(row) => row.id}
                                    empty={
                                        <EmptyState
                                            icon={Package}
                                            title="Sin movimientos de inventario"
                                            description="Ajusta las fechas para consultar otro período."
                                        />
                                    }
                                />
                                {detail && <Pagination meta={detail} />}
                            </>
                        )}
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground print:hidden">
                    <span className="inline-flex items-center gap-1.5">
                        <Users className="size-3.5" />
                        {formatNumber(kpis.reservations)} reservas ·{' '}
                        {formatNumber(kpis.guests)} huéspedes
                    </span>
                    <span>
                        Fuente: facturas, cobros, gastos, reservas, servicios e
                        inventario del hotel activo.
                    </span>
                </div>
            </div>
        </>
    );
}
