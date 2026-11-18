import { Head, Link } from '@inertiajs/react';
import { Building2, Eye, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
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
    create as createBranch,
    destroy as destroyBranch,
    edit as editBranch,
    index as branchesIndex,
    restore as restoreBranch,
    show as showBranch,
} from '@/routes/branches';
import type { ListFiltersState, Paginated } from '@/types';

interface Branch {
    id: number;
    name: string;
    description: string;
    phone_number: string;
    status: boolean;
}

const statusOptions = [
    { value: '1', label: 'Activas' },
    { value: '0', label: 'Inactivas' },
];

export default function Index({
    branches,
    filters,
}: {
    branches: Paginated<Branch>;
    filters: ListFiltersState;
}) {
    const recordAction = useRecordAction({
        destroy: destroyBranch,
        restore: restoreBranch,
    });

    const hasFilters = Boolean(filters.search || filters.status);

    const columns: DataTableColumn<Branch>[] = [
        {
            id: 'name',
            header: 'Sucursal',
            cell: (branch) => (
                <Link
                    href={showBranch(branch.id)}
                    className="font-medium text-foreground transition-colors hover:text-primary"
                >
                    {branch.name}
                </Link>
            ),
        },
        {
            id: 'phone',
            header: 'Teléfono',
            cell: (branch) => (
                <span className="font-mono text-sm">{branch.phone_number}</span>
            ),
        },
        {
            id: 'description',
            header: 'Descripción',
            cell: (branch) => (
                <span
                    className="block max-w-64 truncate text-muted-foreground"
                    title={branch.description}
                >
                    {branch.description || '—'}
                </span>
            ),
        },
        {
            id: 'status',
            header: 'Estado',
            align: 'center',
            cell: (branch) => (
                <StatusBadge status={branch.status ? 'Activo' : 'Inactivo'} />
            ),
        },
        {
            id: 'actions',
            header: 'Acciones',
            align: 'right',
            cell: (branch) => (
                <RowActions
                    actions={[
                        {
                            label: 'Editar',
                            icon: Pencil,
                            href: editBranch(branch.id),
                        },
                        {
                            label: 'Ver detalle',
                            icon: Eye,
                            href: showBranch(branch.id),
                        },
                        branch.status
                            ? {
                                  label: 'Desactivar',
                                  icon: Trash2,
                                  destructive: true,
                                  onSelect: () =>
                                      recordAction.request({
                                          id: branch.id,
                                          action: 'delete',
                                          name: branch.name,
                                      }),
                              }
                            : {
                                  label: 'Restaurar',
                                  icon: RefreshCw,
                                  success: true,
                                  onSelect: () =>
                                      recordAction.request({
                                          id: branch.id,
                                          action: 'restore',
                                          name: branch.name,
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
            <Head title="Sucursales" />

            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <PageHeader
                    title="Sucursales"
                    description="Administra las sucursales que forman parte del hotel."
                    actions={
                        <Button asChild>
                            <Link href={createBranch()}>
                                <Plus className="size-4" />
                                Nueva sucursal
                            </Link>
                        </Button>
                    }
                />

                <ListFilters
                    url={branchesIndex.url()}
                    search={filters.search}
                    searchPlaceholder="Buscar por nombre, teléfono o descripción"
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
                    caption="Sucursales registradas"
                    columns={columns}
                    rows={branches.data}
                    rowKey={(branch) => branch.id}
                    empty={
                        <EmptyState
                            icon={Building2}
                            title={
                                hasFilters
                                    ? 'Sin resultados'
                                    : 'No hay sucursales registradas'
                            }
                            description={
                                hasFilters
                                    ? 'Ajusta la búsqueda o el estado para encontrar la sucursal.'
                                    : 'Registra la primera sucursal para organizar tus edificios.'
                            }
                            action={
                                !hasFilters && (
                                    <Button asChild>
                                        <Link href={createBranch()}>
                                            <Plus className="size-4" />
                                            Nueva sucursal
                                        </Link>
                                    </Button>
                                )
                            }
                        />
                    }
                    footer={<Pagination meta={branches} />}
                />
            </div>

            <ConfirmDialog
                open={pending !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        recordAction.close();
                    }
                }}
                title={isDelete ? 'Desactivar sucursal' : 'Restaurar sucursal'}
                description={
                    pending
                        ? isDelete
                            ? `La sucursal "${pending.name}" quedará inactiva hasta que la restaures.`
                            : `La sucursal "${pending.name}" volverá a estar activa.`
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
            title: 'Sucursales',
            href: '/branches',
        },
    ],
};
