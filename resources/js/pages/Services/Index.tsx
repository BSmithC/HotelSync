import { Head, router } from '@inertiajs/react';
import {
    ArrowRight,
    Ban,
    CheckCheck,
    CircleDollarSign,
    ClipboardList,
    Clock,
    ConciergeBell,
    Pencil,
    Play,
    Plus,
    ReceiptText,
    Sparkles,
    TrendingUp,
} from 'lucide-react';
import { useState } from 'react';
import { DataTable } from '@/components/data-table';
import type { DataTableColumn } from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { ListFilters } from '@/components/list-filters';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { RowActions } from '@/components/row-actions';
import type { RowAction } from '@/components/row-actions';
import { BillDialog } from '@/components/services/bill-dialog';
import { RequestDialog } from '@/components/services/request-dialog';
import { ServiceDialog } from '@/components/services/service-dialog';
import { ServiceVoidDialog } from '@/components/services/void-dialog';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';
import {
    serviceCategoryLabels,
    serviceLabel,
    serviceRequestStatusLabels,
} from '@/lib/service-labels';
import { cn } from '@/lib/utils';
import { index as servicesIndex } from '@/routes/services';
import {
    status as changeRequestStatus,
    voidMethod as voidRequest,
} from '@/routes/services/requests';
import type {
    ServiceCatalogItem,
    ServiceClient,
    ServiceRequest,
    ServiceTab,
    ServicesIndexProps,
} from '@/types';

const requestStatusStyles: Record<string, string> = {
    pendiente:
        'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    en_proceso: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
    completado:
        'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    facturado:
        'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300',
    anulado: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
};

function RequestStatusBadge({ status }: { status: string }) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                requestStatusStyles[status] ?? 'bg-muted text-muted-foreground',
            )}
        >
            {serviceLabel(serviceRequestStatusLabels, status)}
        </span>
    );
}

function clientName(client?: ServiceClient | null): string {
    if (!client) {
        return 'Cliente';
    }

    return `${client.first_name} ${client.last_name}`.trim();
}

export default function Index({
    currency,
    kpis,
    services,
    requests,
    readyRequests,
    recentRequests,
    servicesForRequest,
    clientsForRequest,
    reservationsForRequest,
    openBills,
    filters,
    options,
    permissions,
}: ServicesIndexProps) {
    const tab = filters.tab;
    const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
    const [editingService, setEditingService] =
        useState<ServiceCatalogItem | null>(null);
    const [requestOpen, setRequestOpen] = useState(false);
    const [billTarget, setBillTarget] = useState<ServiceRequest | null>(null);
    const [voidTarget, setVoidTarget] = useState<ServiceRequest | null>(null);

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

        router.get(servicesIndex.url(), query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const changeTab = (next: ServiceTab) => visit({ tab: next });

    const advanceRequest = (request: ServiceRequest, status: string) => {
        router.post(
            changeRequestStatus.url({ serviceRequest: request.id }),
            { status },
            { preserveScroll: true },
        );
    };

    const openEditService = (service: ServiceCatalogItem) => {
        setEditingService(service);
        setServiceDialogOpen(true);
    };

    const requestActions = (request: ServiceRequest): RowAction[] => {
        const actions: RowAction[] = [];

        if (permissions.manage && request.status === 'pendiente') {
            actions.push({
                label: 'Iniciar servicio',
                icon: Play,
                onSelect: () => advanceRequest(request, 'en_proceso'),
            });
        }

        if (
            permissions.manage &&
            (request.status === 'pendiente' || request.status === 'en_proceso')
        ) {
            actions.push({
                label: 'Marcar completado',
                icon: CheckCheck,
                success: true,
                onSelect: () => advanceRequest(request, 'completado'),
            });
        }

        if (permissions.bill && request.status === 'completado') {
            actions.push({
                label: 'Facturar servicio',
                icon: ReceiptText,
                onSelect: () => setBillTarget(request),
            });
        }

        if (request.bill) {
            actions.push({
                label: `Ver factura ${request.bill.number}`,
                icon: ReceiptText,
                href: `/bills/${request.bill.id}`,
            });
        }

        const canVoid =
            request.status !== 'anulado' &&
            (request.status !== 'facturado' ||
                request.bill?.status === 'Anulada');

        if (permissions.manage && canVoid) {
            actions.push({
                label: 'Anular solicitud',
                icon: Ban,
                destructive: true,
                onSelect: () => setVoidTarget(request),
            });
        }

        return actions;
    };

    const serviceColumns: DataTableColumn<ServiceCatalogItem>[] = [
        {
            id: 'name',
            header: 'Servicio',
            cell: (service) => (
                <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                        {service.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                        {service.description ?? 'Sin descripción'}
                    </p>
                </div>
            ),
        },
        {
            id: 'category',
            header: 'Categoría',
            cell: (service) =>
                serviceLabel(serviceCategoryLabels, service.category),
        },
        {
            id: 'price',
            header: 'Precio',
            align: 'right',
            cell: (service) => (
                <span className="font-medium text-foreground">
                    {formatCurrency(service.price, currency)}
                </span>
            ),
        },
        {
            id: 'requests',
            header: 'Solicitudes',
            align: 'right',
            cell: (service) => formatNumber(service.requests_count ?? 0),
        },
        {
            id: 'active',
            header: 'Estado',
            cell: (service) => (
                <span
                    className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                        service.active
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
                            : 'bg-muted text-muted-foreground',
                    )}
                >
                    {service.active ? 'Activo' : 'Inactivo'}
                </span>
            ),
        },
        {
            id: 'actions',
            header: '',
            align: 'right',
            cell: (service) => (
                <RowActions
                    actions={[
                        {
                            label: 'Editar servicio',
                            icon: Pencil,
                            onSelect: () => openEditService(service),
                        },
                    ]}
                />
            ),
        },
    ];

    const requestColumns: DataTableColumn<ServiceRequest>[] = [
        {
            id: 'requested_at',
            header: 'Fecha',
            cell: (request) => formatDate(request.requested_at),
        },
        {
            id: 'service',
            header: 'Servicio',
            cell: (request) => (
                <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                        {request.service?.name ?? 'Servicio'}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                        {serviceLabel(
                            serviceCategoryLabels,
                            request.service?.category,
                        )}
                    </p>
                </div>
            ),
        },
        {
            id: 'client',
            header: 'Cliente',
            cell: (request) => (
                <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">
                        {clientName(request.client)}
                    </p>
                    {request.reservation && (
                        <p className="truncate text-xs text-muted-foreground">
                            Reserva #{request.reservation.id}
                            {request.reservation.room
                                ? ` · Hab. ${request.reservation.room.name}`
                                : ''}
                        </p>
                    )}
                </div>
            ),
        },
        {
            id: 'quantity',
            header: 'Cantidad',
            align: 'right',
            cell: (request) => (
                <div className="text-right">
                    <p className="font-medium text-foreground">
                        {request.quantity} ×{' '}
                        {formatCurrency(request.unit_price, currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {formatCurrency(request.total, currency)}
                    </p>
                </div>
            ),
        },
        {
            id: 'total',
            header: 'Total',
            align: 'right',
            cell: (request) => (
                <span className="font-semibold text-foreground">
                    {formatCurrency(request.total, currency)}
                </span>
            ),
        },
        {
            id: 'status',
            header: 'Estado',
            cell: (request) => <RequestStatusBadge status={request.status} />,
        },
        {
            id: 'bill',
            header: 'Factura',
            cell: (request) =>
                request.bill ? (
                    <div className="min-w-0">
                        <p className="truncate text-sm text-foreground">
                            {request.bill.number}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {request.bill.status}
                        </p>
                    </div>
                ) : (
                    '—'
                ),
        },
        {
            id: 'actions',
            header: '',
            align: 'right',
            cell: (request) => <RowActions actions={requestActions(request)} />,
        },
    ];

    const tabs: { id: ServiceTab; label: string; count?: number }[] = [
        { id: 'resumen', label: 'Resumen' },
        { id: 'catalogo', label: 'Catálogo', count: services.total },
        { id: 'solicitudes', label: 'Solicitudes', count: requests.total },
    ];

    const maxTopTotal = Math.max(
        1,
        ...kpis.topServices.map((item) => Number(item.total)),
    );

    return (
        <>
            <Head title="Servicios" />

            <div className="space-y-5">
                <PageHeader
                    title="Servicios"
                    description="Catálogo, solicitudes de huéspedes y facturación de servicios del hotel."
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

                            {permissions.manage && (
                                <>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setEditingService(null);
                                            setServiceDialogOpen(true);
                                        }}
                                    >
                                        <Plus className="size-4" />
                                        Nuevo servicio
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => setRequestOpen(true)}
                                    >
                                        <ConciergeBell className="size-4" />
                                        Nueva solicitud
                                    </Button>
                                </>
                            )}
                        </>
                    }
                />

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    <StatCard
                        label="Servicios activos"
                        value={formatNumber(kpis.activeServices)}
                        hint="Disponibles en el catálogo"
                        icon={Sparkles}
                        tone="primary"
                    />
                    <StatCard
                        label="Solicitudes del período"
                        value={formatNumber(kpis.requested)}
                        hint="Sin contar anuladas"
                        icon={ClipboardList}
                        tone="primary"
                    />
                    <StatCard
                        label="Abiertas"
                        value={formatNumber(kpis.open)}
                        hint="Pendientes o en proceso"
                        icon={Clock}
                        tone="warning"
                    />
                    <StatCard
                        label="Listas para facturar"
                        value={formatNumber(kpis.readyToBill)}
                        hint="Completadas sin factura"
                        icon={CheckCheck}
                        tone="success"
                    />
                    <StatCard
                        label="Ingresos facturados"
                        value={formatCurrency(kpis.billedRevenue, currency)}
                        hint={`${kpis.billedCount} solicitudes · ticket ${formatCurrency(
                            kpis.averageTicket,
                            currency,
                        )}`}
                        icon={CircleDollarSign}
                        tone="success"
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
                    <div className="grid gap-4 lg:grid-cols-2">
                        <Card className="shadow-xs">
                            <CardContent className="space-y-4 p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h2 className="text-sm font-semibold text-foreground">
                                            Listas para facturar
                                        </h2>
                                        <p className="text-xs text-muted-foreground">
                                            Solicitudes completadas que aún no
                                            generan factura.
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => changeTab('solicitudes')}
                                    >
                                        Ver solicitudes
                                        <ArrowRight className="size-4" />
                                    </Button>
                                </div>

                                {readyRequests.length === 0 ? (
                                    <EmptyState
                                        icon={CheckCheck}
                                        title="No hay servicios por facturar"
                                        description="Cuando una solicitud se complete aparecerá aquí para generar su factura."
                                    />
                                ) : (
                                    <ul className="divide-y divide-border">
                                        {readyRequests.map((request) => (
                                            <li
                                                key={request.id}
                                                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                                            >
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium text-foreground">
                                                        {request.service
                                                            ?.name ??
                                                            'Servicio'}
                                                    </p>
                                                    <p className="truncate text-xs text-muted-foreground">
                                                        {clientName(
                                                            request.client,
                                                        )}{' '}
                                                        ·{' '}
                                                        {formatDate(
                                                            request.requested_at,
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-2">
                                                    <span className="text-sm font-semibold text-foreground">
                                                        {formatCurrency(
                                                            request.total,
                                                            currency,
                                                        )}
                                                    </span>
                                                    {permissions.bill && (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() =>
                                                                setBillTarget(
                                                                    request,
                                                                )
                                                            }
                                                        >
                                                            <ReceiptText className="size-4" />
                                                            Facturar
                                                        </Button>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="shadow-xs">
                            <CardContent className="space-y-4 p-5">
                                <div>
                                    <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                        <TrendingUp className="size-4 text-primary" />
                                        Servicios más vendidos
                                    </h2>
                                    <p className="text-xs text-muted-foreground">
                                        Ingresos facturados del período.
                                    </p>
                                </div>

                                {kpis.topServices.length === 0 ? (
                                    <EmptyState
                                        icon={TrendingUp}
                                        title="Sin servicios facturados"
                                        description="Factura solicitudes completadas para ver el ranking del período."
                                    />
                                ) : (
                                    <ul className="space-y-3">
                                        {kpis.topServices.map((item) => (
                                            <li
                                                key={item.service}
                                                className="space-y-1.5"
                                            >
                                                <div className="flex items-center justify-between gap-3 text-sm">
                                                    <span className="truncate font-medium text-foreground">
                                                        {item.service}
                                                    </span>
                                                    <span className="shrink-0 font-semibold text-foreground">
                                                        {formatCurrency(
                                                            item.total,
                                                            currency,
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                                    <div
                                                        className="h-full rounded-full bg-primary"
                                                        style={{
                                                            width: `${Math.max(
                                                                4,
                                                                (Number(
                                                                    item.total,
                                                                ) /
                                                                    maxTopTotal) *
                                                                    100,
                                                            )}%`,
                                                        }}
                                                    />
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatNumber(
                                                        item.quantity,
                                                    )}{' '}
                                                    unidades
                                                </p>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="shadow-xs lg:col-span-2">
                            <CardContent className="space-y-4 p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h2 className="text-sm font-semibold text-foreground">
                                            Actividad reciente
                                        </h2>
                                        <p className="text-xs text-muted-foreground">
                                            Últimas solicitudes del período.
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => changeTab('solicitudes')}
                                    >
                                        Ver todas
                                        <ArrowRight className="size-4" />
                                    </Button>
                                </div>

                                {recentRequests.length === 0 ? (
                                    <EmptyState
                                        icon={ConciergeBell}
                                        title="Sin solicitudes en el período"
                                        description="Registra una solicitud para empezar a facturar servicios."
                                    />
                                ) : (
                                    <ul className="divide-y divide-border">
                                        {recentRequests.map((request) => (
                                            <li
                                                key={request.id}
                                                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                                            >
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <RequestStatusBadge
                                                        status={request.status}
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium text-foreground">
                                                            {request.service
                                                                ?.name ??
                                                                'Servicio'}
                                                        </p>
                                                        <p className="truncate text-xs text-muted-foreground">
                                                            {clientName(
                                                                request.client,
                                                            )}{' '}
                                                            ·{' '}
                                                            {formatDate(
                                                                request.requested_at,
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="shrink-0 text-sm font-semibold text-foreground">
                                                    {formatCurrency(
                                                        request.total,
                                                        currency,
                                                    )}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {tab === 'catalogo' && (
                    <div className="space-y-3">
                        <ListFilters
                            url={servicesIndex.url()}
                            search={filters.search}
                            searchPlaceholder="Buscar servicio, categoría o descripción…"
                            extraParams={{
                                from: filters.from,
                                to: filters.to,
                                tab,
                            }}
                            selects={[
                                {
                                    key: 'category',
                                    label: 'Categoría',
                                    value: filters.category,
                                    options: options.categories.map(
                                        (value) => ({
                                            value,
                                            label:
                                                serviceCategoryLabels[value] ??
                                                value,
                                        }),
                                    ),
                                },
                                {
                                    key: 'service_state',
                                    label: 'Estado',
                                    value: filters.service_state,
                                    options: [
                                        { value: 'activo', label: 'Activo' },
                                        {
                                            value: 'inactivo',
                                            label: 'Inactivo',
                                        },
                                    ],
                                },
                            ]}
                        />

                        <DataTable
                            caption="Catálogo de servicios"
                            columns={serviceColumns}
                            rows={services.data}
                            rowKey={(service) => service.id}
                            empty={
                                <EmptyState
                                    icon={ConciergeBell}
                                    title="Sin servicios en el catálogo"
                                    description="Crea el primer servicio para registrar solicitudes y facturarlo."
                                    action={
                                        permissions.manage ? (
                                            <Button
                                                type="button"
                                                onClick={() => {
                                                    setEditingService(null);
                                                    setServiceDialogOpen(true);
                                                }}
                                            >
                                                <Plus className="size-4" />
                                                Nuevo servicio
                                            </Button>
                                        ) : undefined
                                    }
                                />
                            }
                        />

                        <Pagination meta={services} />
                    </div>
                )}

                {tab === 'solicitudes' && (
                    <div className="space-y-3">
                        <ListFilters
                            url={servicesIndex.url()}
                            search={filters.search}
                            searchPlaceholder="Buscar servicio, cliente, cédula o factura…"
                            extraParams={{
                                from: filters.from,
                                to: filters.to,
                                tab,
                            }}
                            selects={[
                                {
                                    key: 'request_state',
                                    label: 'Estado',
                                    value: filters.request_state,
                                    options: options.requestStatuses.map(
                                        (value) => ({
                                            value,
                                            label: serviceLabel(
                                                serviceRequestStatusLabels,
                                                value,
                                            ),
                                        }),
                                    ),
                                },
                            ]}
                        />

                        <DataTable
                            caption="Solicitudes de servicios"
                            columns={requestColumns}
                            rows={requests.data}
                            rowKey={(request) => request.id}
                            empty={
                                <EmptyState
                                    icon={ConciergeBell}
                                    title="Sin solicitudes en el período"
                                    description="Ajusta las fechas o registra una nueva solicitud de servicio."
                                    action={
                                        permissions.manage ? (
                                            <Button
                                                type="button"
                                                onClick={() =>
                                                    setRequestOpen(true)
                                                }
                                            >
                                                <ConciergeBell className="size-4" />
                                                Nueva solicitud
                                            </Button>
                                        ) : undefined
                                    }
                                />
                            }
                        />

                        <Pagination meta={requests} />
                    </div>
                )}
            </div>

            {serviceDialogOpen && (
                <ServiceDialog
                    service={editingService}
                    categories={options.categories}
                    onClose={() => {
                        setServiceDialogOpen(false);
                        setEditingService(null);
                    }}
                />
            )}

            {requestOpen && (
                <RequestDialog
                    services={servicesForRequest}
                    clients={clientsForRequest}
                    reservations={reservationsForRequest}
                    currency={currency}
                    defaultDate={filters.to}
                    onClose={() => setRequestOpen(false)}
                />
            )}

            {billTarget && (
                <BillDialog
                    request={billTarget}
                    openBills={openBills}
                    currency={currency}
                    onClose={() => setBillTarget(null)}
                />
            )}

            {voidTarget && (
                <ServiceVoidDialog
                    endpoint={voidRequest.url({
                        serviceRequest: voidTarget.id,
                    })}
                    onClose={() => setVoidTarget(null)}
                />
            )}
        </>
    );
}
