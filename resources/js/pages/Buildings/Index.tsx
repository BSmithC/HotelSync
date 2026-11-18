import { Head, Link } from '@inertiajs/react';
import { Building, Eye, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
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
import {
    create as createBuilding,
    destroy as destroyBuilding,
    edit as editBuilding,
    index as buildingsIndex,
    restore as restoreBuilding,
    show as showBuilding,
} from '@/routes/buildings';
import type { ListFiltersState, Paginated } from '@/types';

interface BuildingRow {
    id: number;
    name: string;
    address?: string | null;
    floors: number;
    active: boolean;
    branch?: { id: number; name: string } | null;
}

const statusOptions = [
    { value: '1', label: 'Activos' },
    { value: '0', label: 'Inactivos' },
];

export default function Index({
    buildings,
    filters,
}: {
    buildings: Paginated<BuildingRow>;
    filters: ListFiltersState;
}) {
    const recordAction = useRecordAction({
        destroy: destroyBuilding,
        restore: restoreBuilding,
    });

    const hasFilters = Boolean(filters.search || filters.status);

    const columns: DataTableColumn<BuildingRow>[] = [
        {
            id: 'name',
            header: 'Edificio',
            cell: (building) => (
                <Link
                    href={showBuilding(building.id)}
                    className="font-medium text-foreground transition-colors hover:text-primary"
                >
                    {building.name}
                </Link>
            ),
        },
        {
            id: 'branch',
            header: 'Sucursal',
            cell: (building) => building.branch?.name ?? '—',
        },
        {
            id: 'floors',
            header: 'Pisos',
            align: 'center',
            cell: (building) => building.floors,
        },
        {
            id: 'address',
            header: 'Dirección',
            cell: (building) => (
                <span
                    className="block max-w-56 truncate text-muted-foreground"
                    title={building.address ?? ''}
                >
                    {building.address || '—'}
                </span>
            ),
        },
        {
            id: 'status',
            header: 'Estado',
            align: 'center',
            cell: (building) => (
                <StatusBadge status={building.active ? 'Activo' : 'Inactivo'} />
            ),
        },
        {
            id: 'actions',
            header: 'Acciones',
            align: 'right',
            cell: (building) => (
                <RowActions
                    actions={[
                        {
                            label: 'Editar',
                            icon: Pencil,
                            href: editBuilding(building.id),
                        },
                        {
                            label: 'Ver detalle',
                            icon: Eye,
                            href: showBuilding(building.id),
                        },
                        building.active
                            ? {
                                  label: 'Desactivar',
                                  icon: Trash2,
                                  destructive: true,
                                  onSelect: () =>
                                      recordAction.request({
                                          id: building.id,
                                          action: 'delete',
                                          name: building.name,
                                      }),
                              }
                            : {
                                  label: 'Restaurar',
                                  icon: RefreshCw,
                                  success: true,
                                  onSelect: () =>
                                      recordAction.request({
                                          id: building.id,
                                          action: 'restore',
                                          name: building.name,
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
            <Head title="Edificios" />

            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <PageHeader
                    title="Edificios"
                    description="Administra los edificios de cada sucursal del hotel."
                    actions={
                        <Button asChild>
                            <Link href={createBuilding()}>
                                <Plus className="size-4" />
                                Nuevo edificio
                            </Link>
                        </Button>
                    }
                />

                <ListFilters
                    url={buildingsIndex.url()}
                    search={filters.search}
                    searchPlaceholder="Buscar por nombre, dirección o descripción"
                    selects={[
                        {
                            key: 'status',
                            label: 'Estado',
                            options: statusOptions,
                            value: filters.status,
                        },
                    ]}
                />

                <DataTable
                    caption="Edificios registrados"
                    columns={columns}
                    rows={buildings.data}
                    rowKey={(building) => building.id}
                    empty={
                        <EmptyState
                            icon={Building}
                            title={
                                hasFilters
                                    ? 'Sin resultados'
                                    : 'No hay edificios registrados'
                            }
                            description={
                                hasFilters
                                    ? 'Ajusta la búsqueda o el estado para encontrar el edificio.'
                                    : 'Registra el primer edificio y vincúlalo a una de tus sucursales.'
                            }
                            action={
                                !hasFilters && (
                                    <Button asChild>
                                        <Link href={createBuilding()}>
                                            <Plus className="size-4" />
                                            Nuevo edificio
                                        </Link>
                                    </Button>
                                )
                            }
                        />
                    }
                    footer={<Pagination meta={buildings} />}
                />
            </div>

            <ConfirmDialog
                open={pending !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        recordAction.close();
                    }
                }}
                title={isDelete ? 'Desactivar edificio' : 'Restaurar edificio'}
                description={
                    pending
                        ? isDelete
                            ? `El edificio "${pending.name}" quedará inactivo hasta que lo restaures.`
                            : `El edificio "${pending.name}" volverá a estar activo.`
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
            title: 'Edificios',
            href: '/buildings',
        },
    ],
};
