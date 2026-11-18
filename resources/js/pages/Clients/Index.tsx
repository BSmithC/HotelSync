import { Head, Link } from '@inertiajs/react';
import { Eye, Pencil, Plus, RefreshCw, Trash2, Users } from 'lucide-react';
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
    create as createClient,
    destroy as destroyClient,
    edit as editClient,
    index as clientsIndex,
    restore as restoreClient,
    show as showClient,
} from '@/routes/clients';
import type { ListFiltersState, Paginated } from '@/types';

interface Client {
    id: number;
    first_name: string;
    last_name: string;
    cedula?: string | null;
    rnc?: string | null;
    address: string;
    phone_number: string;
    active: boolean;
}

const statusOptions = [
    { value: '1', label: 'Activos' },
    { value: '0', label: 'Inactivos' },
];

function formatCedula(cedula: string): string {
    const clean = cedula.replace(/\D/g, '');

    if (clean.length === 11) {
        return `${clean.slice(0, 3)}-${clean.slice(3, 10)}-${clean.slice(10)}`;
    }

    return cedula;
}

function renderDocument(client: Client): string {
    if (client.cedula) {
        return formatCedula(client.cedula);
    }

    if (client.rnc) {
        return `RNC: ${client.rnc}`;
    }

    return '—';
}

export default function Index({
    clients,
    filters,
}: {
    clients: Paginated<Client>;
    filters: ListFiltersState;
}) {
    const recordAction = useRecordAction({
        destroy: destroyClient,
        restore: restoreClient,
    });

    const hasFilters = Boolean(filters.search || filters.status);

    const columns: DataTableColumn<Client>[] = [
        {
            id: 'client',
            header: 'Cliente',
            cell: (client) => (
                <div className="min-w-0">
                    <Link
                        href={showClient(client.id)}
                        className="font-medium text-foreground transition-colors hover:text-primary"
                    >
                        {client.first_name} {client.last_name}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {client.phone_number}
                    </p>
                </div>
            ),
        },
        {
            id: 'document',
            header: 'Documento',
            cell: (client) => (
                <span className="font-mono text-sm">
                    {renderDocument(client)}
                </span>
            ),
        },
        {
            id: 'address',
            header: 'Dirección',
            cell: (client) => (
                <span
                    className="block max-w-56 truncate text-muted-foreground"
                    title={client.address}
                >
                    {client.address || '—'}
                </span>
            ),
        },
        {
            id: 'status',
            header: 'Estado',
            align: 'center',
            cell: (client) => (
                <StatusBadge status={client.active ? 'Activo' : 'Inactivo'} />
            ),
        },
        {
            id: 'actions',
            header: 'Acciones',
            align: 'right',
            cell: (client) => {
                const name = `${client.first_name} ${client.last_name}`;

                return (
                    <RowActions
                        actions={[
                            {
                                label: 'Editar',
                                icon: Pencil,
                                href: editClient(client.id),
                            },
                            {
                                label: 'Ver detalle',
                                icon: Eye,
                                href: showClient(client.id),
                            },
                            client.active
                                ? {
                                      label: 'Desactivar',
                                      icon: Trash2,
                                      destructive: true,
                                      onSelect: () =>
                                          recordAction.request({
                                              id: client.id,
                                              action: 'delete',
                                              name,
                                          }),
                                  }
                                : {
                                      label: 'Restaurar',
                                      icon: RefreshCw,
                                      success: true,
                                      onSelect: () =>
                                          recordAction.request({
                                              id: client.id,
                                              action: 'restore',
                                              name,
                                          }),
                                  },
                        ]}
                    />
                );
            },
        },
    ];

    const pending = recordAction.pending;
    const isDelete = pending?.action === 'delete';

    return (
        <>
            <Head title="Clientes" />

            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <PageHeader
                    title="Clientes"
                    description="Administra los huéspedes y clientes registrados en el hotel."
                    actions={
                        <Button asChild>
                            <Link href={createClient()}>
                                <Plus className="size-4" />
                                Nuevo cliente
                            </Link>
                        </Button>
                    }
                />

                <ListFilters
                    url={clientsIndex.url()}
                    search={filters.search}
                    searchPlaceholder="Buscar por nombre, documento o teléfono"
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
                    caption="Clientes registrados"
                    columns={columns}
                    rows={clients.data}
                    rowKey={(client) => client.id}
                    empty={
                        <EmptyState
                            icon={Users}
                            title={
                                hasFilters
                                    ? 'Sin resultados'
                                    : 'No hay clientes registrados'
                            }
                            description={
                                hasFilters
                                    ? 'Ajusta la búsqueda o el estado para encontrar el cliente que buscas.'
                                    : 'Registra el primer huésped para empezar a crear reservaciones.'
                            }
                            action={
                                !hasFilters && (
                                    <Button asChild>
                                        <Link href={createClient()}>
                                            <Plus className="size-4" />
                                            Nuevo cliente
                                        </Link>
                                    </Button>
                                )
                            }
                        />
                    }
                    footer={<Pagination meta={clients} />}
                />
            </div>

            <ConfirmDialog
                open={pending !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        recordAction.close();
                    }
                }}
                title={isDelete ? 'Desactivar cliente' : 'Restaurar cliente'}
                description={
                    pending
                        ? isDelete
                            ? `El cliente "${pending.name}" quedará inactivo hasta que lo restaures.`
                            : `El cliente "${pending.name}" volverá a estar activo.`
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
            title: 'Clientes',
            href: '/clients',
        },
    ],
};
