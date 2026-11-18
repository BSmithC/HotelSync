import { Head, Link } from '@inertiajs/react';
import { Eye, Pencil, Plus, Receipt, RefreshCw, Trash2 } from 'lucide-react';
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
import { formatCurrency, formatDate } from '@/lib/format';
import {
    create as createBill,
    destroy as destroyBill,
    edit as editBill,
    index as billsIndex,
    restore as restoreBill,
    show as showBill,
} from '@/routes/bills';
import { show as showReservation } from '@/routes/reservations';
import type { ListFiltersState, Paginated } from '@/types';

interface Bill {
    id: number;
    number: string;
    issued_at?: string | null;
    total: string | number;
    status: string;
    active: boolean;
    client?: { id: number; first_name: string; last_name: string } | null;
    reservation?: { id: number } | null;
}

const stateOptions = [
    { value: 'Pendiente', label: 'Pendiente' },
    { value: 'Pagada', label: 'Pagada' },
    { value: 'Anulada', label: 'Anulada' },
];

const statusOptions = [
    { value: '1', label: 'Activas' },
    { value: '0', label: 'Inactivas' },
];

function clientName(bill: Bill): string {
    if (!bill.client) {
        return '—';
    }

    return `${bill.client.first_name} ${bill.client.last_name}`;
}

export default function Index({
    bills,
    filters,
}: {
    bills: Paginated<Bill>;
    filters: ListFiltersState;
}) {
    const recordAction = useRecordAction({
        destroy: destroyBill,
        restore: restoreBill,
    });

    const hasFilters = Boolean(
        filters.search || filters.state || filters.status,
    );

    const columns: DataTableColumn<Bill>[] = [
        {
            id: 'number',
            header: 'Factura',
            cell: (bill) => (
                <Link
                    href={showBill(bill.id)}
                    className="font-mono font-semibold text-foreground transition-colors hover:text-primary"
                >
                    {bill.number || `#${bill.id}`}
                </Link>
            ),
        },
        {
            id: 'client',
            header: 'Huésped',
            cell: (bill) => clientName(bill),
        },
        {
            id: 'reservation',
            header: 'Reserva',
            cell: (bill) =>
                bill.reservation ? (
                    <Link
                        href={showReservation(bill.reservation.id)}
                        className="text-primary hover:underline"
                    >
                        #{bill.reservation.id}
                    </Link>
                ) : (
                    <span className="text-muted-foreground">—</span>
                ),
        },
        {
            id: 'issuedAt',
            header: 'Emisión',
            cell: (bill) => (
                <span className="text-sm text-muted-foreground">
                    {formatDate(bill.issued_at)}
                </span>
            ),
        },
        {
            id: 'total',
            header: 'Total',
            align: 'right',
            cell: (bill) => (
                <span className="font-semibold text-foreground">
                    {formatCurrency(bill.total)}
                </span>
            ),
        },
        {
            id: 'status',
            header: 'Estado',
            align: 'center',
            cell: (bill) => (
                <StatusBadge status={bill.status} active={bill.active} />
            ),
        },
        {
            id: 'actions',
            header: 'Acciones',
            align: 'right',
            cell: (bill) => (
                <RowActions
                    actions={[
                        {
                            label: 'Editar',
                            icon: Pencil,
                            href: editBill(bill.id),
                        },
                        {
                            label: 'Ver detalle',
                            icon: Eye,
                            href: showBill(bill.id),
                        },
                        bill.active
                            ? {
                                  label: 'Anular',
                                  icon: Trash2,
                                  destructive: true,
                                  onSelect: () =>
                                      recordAction.request({
                                          id: bill.id,
                                          action: 'delete',
                                          name: bill.number || `#${bill.id}`,
                                      }),
                              }
                            : {
                                  label: 'Restaurar',
                                  icon: RefreshCw,
                                  success: true,
                                  onSelect: () =>
                                      recordAction.request({
                                          id: bill.id,
                                          action: 'restore',
                                          name: bill.number || `#${bill.id}`,
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
            <Head title="Facturas" />

            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <PageHeader
                    title="Facturas"
                    description="Consulta las facturas emitidas y su estado de pago."
                    actions={
                        <Button asChild>
                            <Link href={createBill()}>
                                <Plus className="size-4" />
                                Nueva factura
                            </Link>
                        </Button>
                    }
                />

                <ListFilters
                    url={billsIndex.url()}
                    search={filters.search}
                    searchPlaceholder="Buscar por número, huésped o estado"
                    selects={[
                        {
                            key: 'state',
                            label: 'Estado de pago',
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
                    caption="Facturas emitidas"
                    columns={columns}
                    rows={bills.data}
                    rowKey={(bill) => bill.id}
                    empty={
                        <EmptyState
                            icon={Receipt}
                            title={
                                hasFilters
                                    ? 'Sin resultados'
                                    : 'No hay facturas registradas'
                            }
                            description={
                                hasFilters
                                    ? 'Ajusta la búsqueda o los filtros de estado para encontrar la factura.'
                                    : 'Emite una factura desde una reserva o crea una nueva para registrar ingresos.'
                            }
                            action={
                                !hasFilters && (
                                    <Button asChild>
                                        <Link href={createBill()}>
                                            <Plus className="size-4" />
                                            Nueva factura
                                        </Link>
                                    </Button>
                                )
                            }
                        />
                    }
                    footer={<Pagination meta={bills} />}
                />
            </div>

            <ConfirmDialog
                open={pending !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        recordAction.close();
                    }
                }}
                title={isDelete ? 'Anular factura' : 'Restaurar factura'}
                description={
                    pending
                        ? isDelete
                            ? `La factura "${pending.name}" quedará anulada y no contará como ingreso.`
                            : `La factura "${pending.name}" volverá a estar activa.`
                        : undefined
                }
                confirmLabel={isDelete ? 'Anular factura' : 'Restaurar'}
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
            title: 'Facturas',
            href: '/bills',
        },
    ],
};
