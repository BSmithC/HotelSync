import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    Ban,
    Banknote,
    CircleDollarSign,
    Download,
    FileText,
    HandCoins,
    Receipt,
    ReceiptText,
    Scale,
    Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { ChartCard } from '@/components/chart-card';
import { FinanceTrendChart } from '@/components/charts/finance-trend-chart';
import { DataTable } from '@/components/data-table';
import type { DataTableColumn } from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { ExpenseDialog } from '@/components/finance/expense-dialog';
import { PaymentDialog } from '@/components/finance/payment-dialog';
import { VoidDialog } from '@/components/finance/void-dialog';
import { ListFilters } from '@/components/list-filters';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { RowActions } from '@/components/row-actions';
import type { RowAction } from '@/components/row-actions';
import { StatCard } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    expenseCategoryLabels,
    financeStatusLabels,
    labelFor,
    movementDirectionLabels,
    paymentMethodLabels,
} from '@/lib/finance-labels';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { show as showBill } from '@/routes/bills';
import {
    exportMethod as financeExport,
    index as financeIndex,
} from '@/routes/finance';
import { voidMethod as voidBill } from '@/routes/finance/bills';
import { voidMethod as voidExpense } from '@/routes/finance/expenses';
import { voidMethod as voidPayment } from '@/routes/finance/payments';
import type {
    FinanceBill,
    FinanceExpense,
    FinanceIndexProps,
    FinanceMovement,
    FinancePayment,
} from '@/types';

type Tab = 'resumen' | 'facturas' | 'cobros' | 'gastos' | 'movimientos';

type VoidTarget = {
    title: string;
    description: string;
    endpoint: string;
};

const methodLabels = paymentMethodLabels;

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

function FinanceStatus({ status }: { status: string }) {
    const styles: Record<string, string> = {
        registrado:
            'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
        anulado: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
        ingreso: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
        egreso: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                styles[status] ?? 'bg-muted text-muted-foreground',
            )}
        >
            {labelFor(financeStatusLabels, status)}
        </span>
    );
}

function clientName(
    client: { first_name: string; last_name: string } | null | undefined,
): string {
    return client ? `${client.first_name} ${client.last_name}` : '—';
}

export default function Index({
    currency,
    period,
    kpis,
    previous,
    series,
    bills,
    payments,
    expenses,
    movements,
    payableBills,
    filters,
    options,
    permissions,
}: FinanceIndexProps) {
    const [tab, setTab] = useState<Tab>(filters.tab);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [expenseOpen, setExpenseOpen] = useState(false);
    const [voidTarget, setVoidTarget] = useState<VoidTarget | null>(null);

    const visit = (params: Record<string, string>) => {
        const query: Record<string, string> = {
            ...filters,
            ...params,
            tab,
        };

        Object.keys(query).forEach((key) => {
            if (query[key] === '') {
                delete query[key];
            }
        });

        router.get(financeIndex.url(), query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const changeTab = (next: Tab) => {
        setTab(next);
    };

    const exportTypes: Record<Exclude<Tab, 'resumen'>, string> = {
        facturas: 'bills',
        cobros: 'payments',
        gastos: 'expenses',
        movimientos: 'movements',
    };

    const exportUrl = financeExport.url({
        query: {
            from: filters.from,
            to: filters.to,
            type: tab === 'resumen' ? 'movements' : exportTypes[tab],
        },
    });

    const requestVoid = (target: VoidTarget) => setVoidTarget(target);

    const billActions = (bill: FinanceBill): RowAction[] => {
        const actions: RowAction[] = [
            {
                label: 'Ver factura',
                icon: FileText,
                href: showBill(bill.id),
            },
        ];

        if (permissions.void && bill.status !== 'Anulada') {
            actions.push({
                label: 'Anular factura',
                icon: Ban,
                destructive: true,
                onSelect: () =>
                    requestVoid({
                        title: `Anular factura ${bill.number}`,
                        description:
                            'La factura quedará anulada y conservará su historial. Solo se permite si no tiene cobros registrados.',
                        endpoint: voidBill.url(bill.id),
                    }),
            });
        }

        return actions;
    };

    const tabs: { id: Tab; label: string; count?: number }[] = [
        { id: 'resumen', label: 'Resumen' },
        { id: 'facturas', label: 'Facturas', count: bills.total },
        { id: 'cobros', label: 'Cobros', count: payments.total },
        { id: 'gastos', label: 'Gastos', count: expenses.total },
        { id: 'movimientos', label: 'Movimientos', count: movements.total },
    ];

    const comparison = [
        {
            label: 'Facturado',
            current: kpis.invoiced,
            previous: previous.invoiced,
            change: kpis.change.invoiced,
        },
        {
            label: 'Cobrado',
            current: kpis.collected,
            previous: previous.collected,
            change: kpis.change.collected,
        },
        {
            label: 'Gastos',
            current: kpis.expenses,
            previous: previous.expenses,
            change: kpis.change.expenses,
        },
        {
            label: 'Flujo neto',
            current: kpis.net,
            previous: previous.net,
            change: kpis.change.net,
        },
    ];

    const billColumns: DataTableColumn<FinanceBill>[] = [
        {
            id: 'number',
            header: 'Factura',
            cell: (bill) => (
                <div className="min-w-0">
                    <Link
                        href={showBill(bill.id)}
                        className="font-medium text-foreground transition-colors hover:text-primary"
                    >
                        {bill.number}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                        {clientName(bill.client)}
                    </p>
                </div>
            ),
        },
        {
            id: 'issued_at',
            header: 'Emitida',
            cell: (bill) => formatDate(bill.issued_at),
        },
        {
            id: 'total',
            header: 'Total',
            align: 'right',
            cell: (bill) => formatCurrency(bill.total, currency),
        },
        {
            id: 'paid',
            header: 'Cobrado',
            align: 'right',
            cell: (bill) => (
                <span className="text-success">
                    {formatCurrency(bill.paid_total ?? 0, currency)}
                </span>
            ),
        },
        {
            id: 'balance',
            header: 'Balance',
            align: 'right',
            cell: (bill) => {
                const balance =
                    Number(bill.total) - Number(bill.paid_total ?? 0);

                return (
                    <span
                        className={cn(
                            balance > 0.005
                                ? 'font-medium text-foreground'
                                : 'text-muted-foreground',
                        )}
                    >
                        {formatCurrency(balance, currency)}
                    </span>
                );
            },
        },
        {
            id: 'status',
            header: 'Estado',
            cell: (bill) => (
                <StatusBadge
                    status={bill.status}
                    active={
                        bill.status === 'Anulada' ? true : Boolean(bill.active)
                    }
                />
            ),
        },
        {
            id: 'actions',
            header: '',
            align: 'right',
            cell: (bill) => <RowActions actions={billActions(bill)} />,
        },
    ];

    const paymentColumns: DataTableColumn<FinancePayment>[] = [
        {
            id: 'bill',
            header: 'Factura',
            cell: (payment) => (
                <div className="min-w-0">
                    <p className="font-medium text-foreground">
                        {payment.bill?.number ?? `#${payment.bill_id}`}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                        {clientName(payment.client)}
                    </p>
                </div>
            ),
        },
        {
            id: 'paid_at',
            header: 'Fecha',
            cell: (payment) => formatDate(payment.paid_at),
        },
        {
            id: 'method',
            header: 'Método',
            cell: (payment) => labelFor(methodLabels, payment.method),
        },
        {
            id: 'amount',
            header: 'Monto',
            align: 'right',
            cell: (payment) => (
                <span className="font-medium text-success">
                    {formatCurrency(payment.amount, currency)}
                </span>
            ),
        },
        {
            id: 'reference',
            header: 'Referencia',
            cell: (payment) => (
                <span className="text-sm text-muted-foreground">
                    {payment.reference ?? '—'}
                </span>
            ),
        },
        {
            id: 'status',
            header: 'Estado',
            cell: (payment) => (
                <div className="space-y-1">
                    <FinanceStatus status={payment.status} />
                    {payment.void_reason && (
                        <p className="max-w-56 truncate text-xs text-muted-foreground">
                            {payment.void_reason}
                        </p>
                    )}
                </div>
            ),
        },
        {
            id: 'actions',
            header: '',
            align: 'right',
            cell: (payment) => {
                if (!permissions.void || payment.status === 'anulado') {
                    return null;
                }

                return (
                    <RowActions
                        actions={[
                            {
                                label: 'Anular cobro',
                                icon: Ban,
                                destructive: true,
                                onSelect: () =>
                                    requestVoid({
                                        title: 'Anular cobro',
                                        description: `Se registrará un egreso de reverso por ${formatCurrency(
                                            payment.amount,
                                            currency,
                                        )} y el cobro quedará anulado.`,
                                        endpoint: voidPayment.url(payment.id),
                                    }),
                            },
                        ]}
                    />
                );
            },
        },
    ];

    const expenseColumns: DataTableColumn<FinanceExpense>[] = [
        {
            id: 'expense_date',
            header: 'Fecha',
            cell: (expense) => formatDate(expense.expense_date),
        },
        {
            id: 'description',
            header: 'Descripción',
            cell: (expense) => (
                <div className="min-w-0">
                    <p className="font-medium text-foreground">
                        {expense.description}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                        {labelFor(expenseCategoryLabels, expense.category)}
                        {expense.supplier ? ` · ${expense.supplier}` : ''}
                    </p>
                </div>
            ),
        },
        {
            id: 'method',
            header: 'Método',
            cell: (expense) => labelFor(methodLabels, expense.method),
        },
        {
            id: 'amount',
            header: 'Monto',
            align: 'right',
            cell: (expense) => (
                <span className="font-medium text-destructive">
                    {formatCurrency(expense.amount, currency)}
                </span>
            ),
        },
        {
            id: 'reference',
            header: 'Referencia',
            cell: (expense) => (
                <span className="text-sm text-muted-foreground">
                    {expense.reference ?? '—'}
                </span>
            ),
        },
        {
            id: 'status',
            header: 'Estado',
            cell: (expense) => (
                <div className="space-y-1">
                    <FinanceStatus status={expense.status} />
                    {expense.void_reason && (
                        <p className="max-w-56 truncate text-xs text-muted-foreground">
                            {expense.void_reason}
                        </p>
                    )}
                </div>
            ),
        },
        {
            id: 'actions',
            header: '',
            align: 'right',
            cell: (expense) => {
                if (!permissions.void || expense.status === 'anulado') {
                    return null;
                }

                return (
                    <RowActions
                        actions={[
                            {
                                label: 'Anular gasto',
                                icon: Ban,
                                destructive: true,
                                onSelect: () =>
                                    requestVoid({
                                        title: 'Anular gasto',
                                        description: `Se registrará un ingreso de reverso por ${formatCurrency(
                                            expense.amount,
                                            currency,
                                        )} y el gasto quedará anulado.`,
                                        endpoint: voidExpense.url(expense.id),
                                    }),
                            },
                        ]}
                    />
                );
            },
        },
    ];

    const movementColumns: DataTableColumn<FinanceMovement>[] = [
        {
            id: 'occurred_at',
            header: 'Fecha',
            cell: (movement) => formatDateTime(movement.occurred_at),
        },
        {
            id: 'direction',
            header: 'Tipo',
            cell: (movement) => <FinanceStatus status={movement.direction} />,
        },
        {
            id: 'description',
            header: 'Descripción',
            cell: (movement) => (
                <div className="min-w-0">
                    <p className="font-medium text-foreground">
                        {movement.description}
                    </p>
                    {movement.reversal_of_id && (
                        <p className="text-xs text-muted-foreground">
                            Reverso del movimiento #{movement.reversal_of_id}
                        </p>
                    )}
                </div>
            ),
        },
        {
            id: 'amount',
            header: 'Monto',
            align: 'right',
            cell: (movement) => (
                <span
                    className={cn(
                        'font-medium',
                        movement.direction === 'ingreso'
                            ? 'text-success'
                            : 'text-destructive',
                    )}
                >
                    {movement.direction === 'ingreso' ? '+' : '−'}
                    {formatCurrency(movement.amount, currency)}
                </span>
            ),
        },
        {
            id: 'created_by',
            header: 'Registrado por',
            cell: (movement) => movement.created_by?.name ?? 'Sistema',
        },
    ];

    return (
        <>
            <Head title="Finanzas" />

            <div className="space-y-5">
                <PageHeader
                    title="Finanzas"
                    description="Facturación, cobros, gastos y libro de movimientos del hotel."
                    actions={
                        <>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="date"
                                    value={filters.from}
                                    onChange={(event) =>
                                        visit({ from: event.target.value })
                                    }
                                    aria-label="Desde"
                                    className="w-auto"
                                />
                                <span className="text-xs text-muted-foreground">
                                    al
                                </span>
                                <Input
                                    type="date"
                                    value={filters.to}
                                    onChange={(event) =>
                                        visit({ to: event.target.value })
                                    }
                                    aria-label="Hasta"
                                    className="w-auto"
                                />
                            </div>

                            {permissions.export && (
                                <Button asChild variant="outline">
                                    <a href={exportUrl}>
                                        <Download className="size-4" />
                                        Exportar CSV
                                    </a>
                                </Button>
                            )}

                            {permissions.manage && (
                                <>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setExpenseOpen(true)}
                                    >
                                        <Receipt className="size-4" />
                                        Registrar gasto
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => setPaymentOpen(true)}
                                    >
                                        <Banknote className="size-4" />
                                        Registrar cobro
                                    </Button>
                                </>
                            )}
                        </>
                    }
                />

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    <StatCard
                        label="Facturado"
                        value={formatCurrency(kpis.invoiced, currency)}
                        hint={`${kpis.invoicedCount} facturas en el período`}
                        icon={ReceiptText}
                        tone="primary"
                        trend={trend(kpis.change.invoiced) ?? undefined}
                    />
                    <StatCard
                        label="Cobrado"
                        value={formatCurrency(kpis.collected, currency)}
                        hint="Cobros registrados en el período"
                        icon={Banknote}
                        tone="success"
                        trend={trend(kpis.change.collected) ?? undefined}
                    />
                    <StatCard
                        label="Gastos"
                        value={formatCurrency(kpis.expenses, currency)}
                        hint="Gastos registrados en el período"
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
                        hint={`${kpis.pendingCount} facturas pendientes al ${formatDate(
                            period.to,
                        )}`}
                        icon={CircleDollarSign}
                        tone="danger"
                    />
                </div>

                <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1.5">
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
                                    {item.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {tab === 'resumen' && (
                    <div className="space-y-4">
                        <div className="grid gap-4 lg:grid-cols-3">
                            <ChartCard
                                title="Evolución financiera"
                                description="Facturado, cobrado y gastos de los últimos seis meses."
                                className="lg:col-span-2"
                            >
                                <FinanceTrendChart
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
                                            {period.days} días frente al período
                                            anterior.
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
                                                            {formatCurrency(
                                                                row.previous,
                                                                currency,
                                                            )}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-semibold text-foreground">
                                                            {formatCurrency(
                                                                row.current,
                                                                currency,
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
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid gap-3 md:grid-cols-3">
                            <button
                                type="button"
                                onClick={() => changeTab('cobros')}
                                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
                            >
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
                                    <HandCoins className="size-5" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-medium text-foreground">
                                        Cobros del período
                                    </span>
                                    <span className="block truncate text-xs text-muted-foreground">
                                        {payments.total} operaciones registradas
                                    </span>
                                </span>
                                <ArrowRight className="size-4 text-muted-foreground" />
                            </button>

                            <button
                                type="button"
                                onClick={() => changeTab('gastos')}
                                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
                            >
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                                    <Receipt className="size-5" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-medium text-foreground">
                                        Gastos del período
                                    </span>
                                    <span className="block truncate text-xs text-muted-foreground">
                                        {expenses.total} gastos registrados
                                    </span>
                                </span>
                                <ArrowRight className="size-4 text-muted-foreground" />
                            </button>

                            <button
                                type="button"
                                onClick={() => changeTab('facturas')}
                                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
                            >
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <FileText className="size-5" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-medium text-foreground">
                                        Facturas del período
                                    </span>
                                    <span className="block truncate text-xs text-muted-foreground">
                                        {bills.total} facturas emitidas
                                    </span>
                                </span>
                                <ArrowRight className="size-4 text-muted-foreground" />
                            </button>
                        </div>
                    </div>
                )}

                {tab === 'facturas' && (
                    <div className="space-y-3">
                        <ListFilters
                            url={financeIndex.url()}
                            search={filters.search}
                            searchPlaceholder="Buscar factura, cliente o estado…"
                            extraParams={{
                                from: filters.from,
                                to: filters.to,
                                tab,
                            }}
                            selects={[
                                {
                                    key: 'bill_state',
                                    label: 'Estado',
                                    value: filters.bill_state,
                                    options: options.billStatuses.map(
                                        (value) => ({
                                            value,
                                            label: value,
                                        }),
                                    ),
                                },
                            ]}
                        />

                        <DataTable
                            caption="Facturas del período"
                            columns={billColumns}
                            rows={bills.data}
                            rowKey={(bill) => bill.id}
                            empty={
                                <EmptyState
                                    icon={ReceiptText}
                                    title="Sin facturas en el período"
                                    description="Ajusta las fechas o emite una factura desde Facturación."
                                />
                            }
                        />

                        <Pagination meta={bills} />
                    </div>
                )}

                {tab === 'cobros' && (
                    <div className="space-y-3">
                        <ListFilters
                            url={financeIndex.url()}
                            search={filters.search}
                            searchPlaceholder="Buscar factura, cliente o referencia…"
                            extraParams={{
                                from: filters.from,
                                to: filters.to,
                                tab,
                            }}
                            selects={[
                                {
                                    key: 'payment_method',
                                    label: 'Método',
                                    value: filters.payment_method,
                                    options: options.paymentMethods.map(
                                        (value) => ({
                                            value,
                                            label: labelFor(
                                                methodLabels,
                                                value,
                                            ),
                                        }),
                                    ),
                                },
                                {
                                    key: 'payment_state',
                                    label: 'Estado',
                                    value: filters.payment_state,
                                    options: options.paymentStatuses.map(
                                        (value) => ({
                                            value,
                                            label: labelFor(
                                                financeStatusLabels,
                                                value,
                                            ),
                                        }),
                                    ),
                                },
                            ]}
                        />

                        <DataTable
                            caption="Cobros del período"
                            columns={paymentColumns}
                            rows={payments.data}
                            rowKey={(payment) => payment.id}
                            empty={
                                <EmptyState
                                    icon={HandCoins}
                                    title="Sin cobros en el período"
                                    description="Registra un cobro con el botón superior para empezar a conciliar."
                                />
                            }
                        />

                        <Pagination meta={payments} />
                    </div>
                )}

                {tab === 'gastos' && (
                    <div className="space-y-3">
                        <ListFilters
                            url={financeIndex.url()}
                            search={filters.search}
                            searchPlaceholder="Buscar descripción, suplidor o referencia…"
                            extraParams={{
                                from: filters.from,
                                to: filters.to,
                                tab,
                            }}
                            selects={[
                                {
                                    key: 'expense_category',
                                    label: 'Categoría',
                                    value: filters.expense_category,
                                    options: options.expenseCategories.map(
                                        (value) => ({
                                            value,
                                            label: labelFor(
                                                expenseCategoryLabels,
                                                value,
                                            ),
                                        }),
                                    ),
                                },
                                {
                                    key: 'expense_state',
                                    label: 'Estado',
                                    value: filters.expense_state,
                                    options: options.expenseStatuses.map(
                                        (value) => ({
                                            value,
                                            label: labelFor(
                                                financeStatusLabels,
                                                value,
                                            ),
                                        }),
                                    ),
                                },
                            ]}
                        />

                        <DataTable
                            caption="Gastos del período"
                            columns={expenseColumns}
                            rows={expenses.data}
                            rowKey={(expense) => expense.id}
                            empty={
                                <EmptyState
                                    icon={Wallet}
                                    title="Sin gastos en el período"
                                    description="Registra los gastos operativos para calcular el flujo neto real."
                                />
                            }
                        />

                        <Pagination meta={expenses} />
                    </div>
                )}

                {tab === 'movimientos' && (
                    <div className="space-y-3">
                        <ListFilters
                            url={financeIndex.url()}
                            search={filters.search}
                            searchPlaceholder="Buscar en la descripción del movimiento…"
                            extraParams={{
                                from: filters.from,
                                to: filters.to,
                                tab,
                            }}
                            selects={[
                                {
                                    key: 'movement_direction',
                                    label: 'Tipo',
                                    value: filters.movement_direction,
                                    options: options.movementDirections.map(
                                        (value) => ({
                                            value,
                                            label: labelFor(
                                                movementDirectionLabels,
                                                value,
                                            ),
                                        }),
                                    ),
                                },
                            ]}
                        />

                        <DataTable
                            caption="Libro de movimientos"
                            columns={movementColumns}
                            rows={movements.data}
                            rowKey={(movement) => movement.id}
                            empty={
                                <EmptyState
                                    icon={Scale}
                                    title="Sin movimientos en el período"
                                    description="Cada cobro, gasto y reverso aparece aquí con su trazabilidad."
                                />
                            }
                        />

                        <Pagination meta={movements} />
                    </div>
                )}
            </div>

            {paymentOpen && (
                <PaymentDialog
                    bills={payableBills}
                    currency={currency}
                    defaultDate={filters.to}
                    onClose={() => setPaymentOpen(false)}
                />
            )}

            {expenseOpen && (
                <ExpenseDialog
                    defaultDate={filters.to}
                    onClose={() => setExpenseOpen(false)}
                />
            )}

            {voidTarget && (
                <VoidDialog
                    title={voidTarget.title}
                    description={voidTarget.description}
                    endpoint={voidTarget.endpoint}
                    onClose={() => setVoidTarget(null)}
                />
            )}
        </>
    );
}
