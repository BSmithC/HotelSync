import { Head, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowDownToLine,
    ArrowRight,
    ArrowUpFromLine,
    Ban,
    Boxes,
    ClipboardList,
    Package,
    Pencil,
    Plus,
    Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { DataTable } from '@/components/data-table';
import type { DataTableColumn } from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { ItemDialog } from '@/components/inventory/item-dialog';
import { MovementDialog } from '@/components/inventory/movement-dialog';
import { InventoryVoidDialog } from '@/components/inventory/void-dialog';
import { ListFilters } from '@/components/list-filters';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { RowActions } from '@/components/row-actions';
import type { RowAction } from '@/components/row-actions';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';
import {
    inventoryCategoryLabels,
    inventoryLabel,
    inventoryMovementTypeLabels,
    inventoryUnitLabels,
} from '@/lib/inventory-labels';
import { cn } from '@/lib/utils';
import { index as inventoryIndex } from '@/routes/inventory';
import { voidMethod as voidMovement } from '@/routes/inventory/movements';
import type {
    InventoryAlert,
    InventoryIndexProps,
    InventoryItem,
    InventoryItemOption,
    InventoryMovement,
    InventoryTab,
} from '@/types';

type VoidTarget = {
    title: string;
    description: string;
    endpoint: string;
};

function StockBadge({ stock, minStock }: { stock: number; minStock: number }) {
    const out = stock <= 0;
    const low = !out && stock <= minStock;

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                out
                    ? 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300'
                    : low
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
            )}
        >
            {out ? 'Agotado' : low ? 'Bajo mínimo' : 'Disponible'}
        </span>
    );
}

function MovementTypeBadge({ movement }: { movement: InventoryMovement }) {
    const styles: Record<string, string> = {
        entrada:
            'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
        salida: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
        ajuste: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
    };

    return (
        <div className="flex flex-wrap items-center gap-1">
            <span
                className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                    styles[movement.type] ?? 'bg-muted text-muted-foreground',
                )}
            >
                {inventoryLabel(inventoryMovementTypeLabels, movement.type)}
            </span>
            {movement.reversal_of_id !== null && (
                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    Reverso #{movement.reversal_of_id}
                </span>
            )}
        </div>
    );
}

export default function Index({
    currency,
    kpis,
    items,
    movements,
    alerts,
    itemsForMovement,
    filters,
    options,
    permissions,
}: InventoryIndexProps) {
    const tab = filters.tab;
    const [itemDialogOpen, setItemDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [movementOpen, setMovementOpen] = useState(false);
    const [movementItem, setMovementItem] =
        useState<InventoryItemOption | null>(null);
    const [voidTarget, setVoidTarget] = useState<VoidTarget | null>(null);

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

        router.get(inventoryIndex.url(), query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const changeTab = (next: InventoryTab) => visit({ tab: next });

    const openMovement = (item?: { id: number } | null) => {
        const option =
            item === undefined || item === null
                ? null
                : (itemsForMovement.find((entry) => entry.id === item.id) ??
                  null);

        setMovementItem(option);
        setMovementOpen(true);
    };

    const openEdit = (item: InventoryItem) => {
        setEditingItem(item);
        setItemDialogOpen(true);
    };

    const itemActions = (item: InventoryItem): RowAction[] => {
        const actions: RowAction[] = [
            {
                label: 'Editar artículo',
                icon: Pencil,
                onSelect: () => openEdit(item),
            },
        ];

        if (permissions.manage && item.active) {
            actions.unshift({
                label: 'Registrar movimiento',
                icon: Boxes,
                onSelect: () => openMovement(item),
            });
        }

        return actions;
    };

    const itemColumns: DataTableColumn<InventoryItem>[] = [
        {
            id: 'name',
            header: 'Artículo',
            cell: (item) => (
                <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                        {item.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                        {item.sku ?? 'Sin SKU'}
                    </p>
                </div>
            ),
        },
        {
            id: 'category',
            header: 'Categoría',
            cell: (item) =>
                inventoryLabel(inventoryCategoryLabels, item.category),
        },
        {
            id: 'stock',
            header: 'Stock',
            align: 'right',
            cell: (item) => {
                const stock = Number(item.stock);

                return (
                    <div className="flex flex-col items-end gap-1">
                        <span className="font-semibold text-foreground">
                            {formatNumber(stock)}{' '}
                            <span className="text-xs font-normal text-muted-foreground">
                                {inventoryLabel(inventoryUnitLabels, item.unit)}
                            </span>
                        </span>
                        <StockBadge
                            stock={stock}
                            minStock={Number(item.min_stock)}
                        />
                    </div>
                );
            },
        },
        {
            id: 'min_stock',
            header: 'Mínimo',
            align: 'right',
            cell: (item) => formatNumber(item.min_stock),
        },
        {
            id: 'unit_cost',
            header: 'Costo',
            align: 'right',
            cell: (item) => formatCurrency(item.unit_cost, currency),
        },
        {
            id: 'value',
            header: 'Valor',
            align: 'right',
            cell: (item) => (
                <span className="font-medium text-foreground">
                    {formatCurrency(
                        Number(item.stock) * Number(item.unit_cost),
                        currency,
                    )}
                </span>
            ),
        },
        {
            id: 'active',
            header: 'Estado',
            cell: (item) => (
                <span
                    className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                        item.active
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
                            : 'bg-muted text-muted-foreground',
                    )}
                >
                    {item.active ? 'Activo' : 'Inactivo'}
                </span>
            ),
        },
        {
            id: 'actions',
            header: '',
            align: 'right',
            cell: (item) => <RowActions actions={itemActions(item)} />,
        },
    ];

    const movementColumns: DataTableColumn<InventoryMovement>[] = [
        {
            id: 'occurred_at',
            header: 'Fecha',
            cell: (movement) => formatDate(movement.occurred_at),
        },
        {
            id: 'item',
            header: 'Artículo',
            cell: (movement) => (
                <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                        {movement.item?.name ??
                            `Artículo #${movement.inventory_item_id}`}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                        {movement.item?.sku ?? 'Sin SKU'}
                    </p>
                </div>
            ),
        },
        {
            id: 'type',
            header: 'Tipo',
            cell: (movement) => <MovementTypeBadge movement={movement} />,
        },
        {
            id: 'quantity',
            header: 'Cantidad',
            align: 'right',
            cell: (movement) => {
                const quantity = Number(movement.quantity);

                return (
                    <span
                        className={cn(
                            'font-semibold',
                            quantity >= 0 ? 'text-success' : 'text-destructive',
                        )}
                    >
                        {quantity >= 0 ? '+' : '−'}
                        {formatNumber(Math.abs(quantity))}
                    </span>
                );
            },
        },
        {
            id: 'reason',
            header: 'Detalle',
            cell: (movement) => (
                <div className="max-w-64 min-w-0">
                    <p className="truncate text-sm text-foreground">
                        {movement.reason ?? '—'}
                    </p>
                    {movement.reference && (
                        <p className="truncate text-xs text-muted-foreground">
                            Ref. {movement.reference}
                        </p>
                    )}
                </div>
            ),
        },
        {
            id: 'created_by',
            header: 'Registrado por',
            cell: (movement) => movement.created_by?.name ?? 'Sistema',
        },
        {
            id: 'state',
            header: 'Estado',
            cell: (movement) => (
                <div className="space-y-1">
                    <span
                        className={cn(
                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                            movement.voided_at
                                ? 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
                        )}
                    >
                        {movement.voided_at ? 'Anulado' : 'Vigente'}
                    </span>
                    {movement.void_reason && (
                        <p className="max-w-56 truncate text-xs text-muted-foreground">
                            {movement.void_reason}
                        </p>
                    )}
                </div>
            ),
        },
        {
            id: 'actions',
            header: '',
            align: 'right',
            cell: (movement) => {
                if (
                    !permissions.adjust ||
                    movement.voided_at !== null ||
                    movement.reversal_of_id !== null
                ) {
                    return null;
                }

                return (
                    <RowActions
                        actions={[
                            {
                                label: 'Anular movimiento',
                                icon: Ban,
                                destructive: true,
                                onSelect: () =>
                                    setVoidTarget({
                                        title: 'Anular movimiento',
                                        description:
                                            'Se registrará el movimiento opuesto en el libro y el original quedará anulado con su motivo.',
                                        endpoint: voidMovement.url(movement.id),
                                    }),
                            },
                        ]}
                    />
                );
            },
        },
    ];

    const tabs: { id: InventoryTab; label: string; count?: number }[] = [
        { id: 'resumen', label: 'Resumen' },
        { id: 'articulos', label: 'Artículos', count: items.total },
        { id: 'movimientos', label: 'Movimientos', count: movements.total },
    ];

    const alertActions = (alert: InventoryAlert) => {
        if (!permissions.manage) {
            return;
        }

        return (
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => openMovement(alert)}
            >
                <ArrowDownToLine className="size-4" />
                Entrada
            </Button>
        );
    };

    return (
        <>
            <Head title="Inventario" />

            <div className="space-y-5">
                <PageHeader
                    title="Inventario"
                    description="Catálogo, existencias y libro de movimientos con ajustes trazables."
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
                                            setEditingItem(null);
                                            setItemDialogOpen(true);
                                        }}
                                    >
                                        <Plus className="size-4" />
                                        Nuevo artículo
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => openMovement(null)}
                                    >
                                        <Boxes className="size-4" />
                                        Registrar movimiento
                                    </Button>
                                </>
                            )}
                        </>
                    }
                />

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    <StatCard
                        label="Artículos activos"
                        value={formatNumber(kpis.totalItems)}
                        hint="Catálogo disponible"
                        icon={Package}
                        tone="primary"
                    />
                    <StatCard
                        label="Unidades en stock"
                        value={formatNumber(kpis.totalStock)}
                        hint="Suma de existencias activas"
                        icon={Boxes}
                        tone="success"
                    />
                    <StatCard
                        label="Bajo mínimo"
                        value={formatNumber(kpis.lowStock)}
                        hint="Requieren reposición"
                        icon={AlertTriangle}
                        tone="warning"
                    />
                    <StatCard
                        label="Agotados"
                        value={formatNumber(kpis.outOfStock)}
                        hint="Sin existencias"
                        icon={ArrowUpFromLine}
                        tone="danger"
                    />
                    <StatCard
                        label="Valor del inventario"
                        value={formatCurrency(kpis.inventoryValue, currency)}
                        hint="Stock por costo unitario"
                        icon={Wallet}
                        tone="primary"
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
                                            Alertas de stock
                                        </h2>
                                        <p className="text-xs text-muted-foreground">
                                            Artículos agotados o por debajo del
                                            mínimo.
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => changeTab('articulos')}
                                    >
                                        Ver catálogo
                                        <ArrowRight className="size-4" />
                                    </Button>
                                </div>

                                {alerts.length === 0 ? (
                                    <EmptyState
                                        icon={Boxes}
                                        title="Todo el inventario está en orden"
                                        description="Ningún artículo activo está por debajo de su stock mínimo."
                                    />
                                ) : (
                                    <ul className="divide-y divide-border">
                                        {alerts.map((alert) => (
                                            <li
                                                key={alert.id}
                                                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                                            >
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium text-foreground">
                                                        {alert.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatNumber(
                                                            alert.stock,
                                                        )}{' '}
                                                        / mínimo{' '}
                                                        {formatNumber(
                                                            alert.min_stock,
                                                        )}{' '}
                                                        ·{' '}
                                                        {inventoryLabel(
                                                            inventoryUnitLabels,
                                                            alert.unit,
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-2">
                                                    <StockBadge
                                                        stock={Number(
                                                            alert.stock,
                                                        )}
                                                        minStock={Number(
                                                            alert.min_stock,
                                                        )}
                                                    />
                                                    {alertActions(alert)}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="shadow-xs">
                            <CardContent className="space-y-4 p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h2 className="text-sm font-semibold text-foreground">
                                            Actividad reciente
                                        </h2>
                                        <p className="text-xs text-muted-foreground">
                                            Últimos movimientos del período.
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => changeTab('movimientos')}
                                    >
                                        Ver libro
                                        <ArrowRight className="size-4" />
                                    </Button>
                                </div>

                                {movements.data.length === 0 ? (
                                    <EmptyState
                                        icon={ClipboardList}
                                        title="Sin movimientos en el período"
                                        description="Registra entradas, salidas o ajustes para verlos aquí."
                                    />
                                ) : (
                                    <ul className="divide-y divide-border">
                                        {movements.data
                                            .slice(0, 6)
                                            .map((movement) => {
                                                const quantity = Number(
                                                    movement.quantity,
                                                );

                                                return (
                                                    <li
                                                        key={movement.id}
                                                        className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-medium text-foreground">
                                                                {movement.item
                                                                    ?.name ??
                                                                    `Artículo #${movement.inventory_item_id}`}
                                                            </p>
                                                            <p className="truncate text-xs text-muted-foreground">
                                                                {formatDate(
                                                                    movement.occurred_at,
                                                                )}
                                                                {movement.reason
                                                                    ? ` · ${movement.reason}`
                                                                    : ''}
                                                            </p>
                                                        </div>
                                                        <span
                                                            className={cn(
                                                                'shrink-0 text-sm font-semibold',
                                                                quantity >= 0
                                                                    ? 'text-success'
                                                                    : 'text-destructive',
                                                            )}
                                                        >
                                                            {quantity >= 0
                                                                ? '+'
                                                                : '−'}
                                                            {formatNumber(
                                                                Math.abs(
                                                                    quantity,
                                                                ),
                                                            )}
                                                        </span>
                                                    </li>
                                                );
                                            })}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {tab === 'articulos' && (
                    <div className="space-y-3">
                        <ListFilters
                            url={inventoryIndex.url()}
                            search={filters.search}
                            searchPlaceholder="Buscar artículo, SKU o categoría…"
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
                                                inventoryCategoryLabels[
                                                    value
                                                ] ?? value,
                                        }),
                                    ),
                                },
                                {
                                    key: 'state',
                                    label: 'Estado',
                                    value: filters.state,
                                    options: [
                                        { value: 'activo', label: 'Activo' },
                                        {
                                            value: 'inactivo',
                                            label: 'Inactivo',
                                        },
                                    ],
                                },
                                {
                                    key: 'stock_state',
                                    label: 'Stock',
                                    value: filters.stock_state,
                                    options: [
                                        {
                                            value: 'bajo',
                                            label: 'Bajo mínimo',
                                        },
                                        { value: 'agotado', label: 'Agotado' },
                                    ],
                                },
                            ]}
                        />

                        <DataTable
                            caption="Catálogo de inventario"
                            columns={itemColumns}
                            rows={items.data}
                            rowKey={(item) => item.id}
                            empty={
                                <EmptyState
                                    icon={Package}
                                    title="Sin artículos en el catálogo"
                                    description="Crea el primer artículo para empezar a controlar existencias."
                                    action={
                                        permissions.manage ? (
                                            <Button
                                                type="button"
                                                onClick={() => {
                                                    setEditingItem(null);
                                                    setItemDialogOpen(true);
                                                }}
                                            >
                                                <Plus className="size-4" />
                                                Nuevo artículo
                                            </Button>
                                        ) : undefined
                                    }
                                />
                            }
                        />

                        <Pagination meta={items} />
                    </div>
                )}

                {tab === 'movimientos' && (
                    <div className="space-y-3">
                        <ListFilters
                            url={inventoryIndex.url()}
                            search={filters.search}
                            searchPlaceholder="Buscar artículo, motivo o referencia…"
                            extraParams={{
                                from: filters.from,
                                to: filters.to,
                                tab,
                            }}
                            selects={[
                                {
                                    key: 'movement_type',
                                    label: 'Tipo',
                                    value: filters.movement_type,
                                    options: options.movementTypes.map(
                                        (value) => ({
                                            value,
                                            label: inventoryLabel(
                                                inventoryMovementTypeLabels,
                                                value,
                                            ),
                                        }),
                                    ),
                                },
                                {
                                    key: 'movement_state',
                                    label: 'Estado',
                                    value: filters.movement_state,
                                    options: [
                                        { value: 'vigente', label: 'Vigente' },
                                        { value: 'anulado', label: 'Anulado' },
                                        { value: 'reverso', label: 'Reverso' },
                                    ],
                                },
                            ]}
                        />

                        <DataTable
                            caption="Libro de movimientos de inventario"
                            columns={movementColumns}
                            rows={movements.data}
                            rowKey={(movement) => movement.id}
                            empty={
                                <EmptyState
                                    icon={ClipboardList}
                                    title="Sin movimientos en el período"
                                    description="Ajusta las fechas o registra una entrada, salida o ajuste."
                                />
                            }
                        />

                        <Pagination meta={movements} />
                    </div>
                )}
            </div>

            {itemDialogOpen && (
                <ItemDialog
                    item={editingItem}
                    categories={options.categories}
                    units={options.units}
                    onClose={() => {
                        setItemDialogOpen(false);
                        setEditingItem(null);
                    }}
                />
            )}

            {movementOpen && (
                <MovementDialog
                    items={itemsForMovement}
                    defaultItem={movementItem}
                    defaultDate={filters.to}
                    canAdjust={permissions.adjust}
                    onClose={() => {
                        setMovementOpen(false);
                        setMovementItem(null);
                    }}
                />
            )}

            {voidTarget && (
                <InventoryVoidDialog
                    title={voidTarget.title}
                    description={voidTarget.description}
                    endpoint={voidTarget.endpoint}
                    onClose={() => setVoidTarget(null)}
                />
            )}
        </>
    );
}
