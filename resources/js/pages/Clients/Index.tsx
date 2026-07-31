import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Pencil, Trash2, Users, RefreshCw, Eye } from 'lucide-react';

interface Client {
    id: number;
    first_name: string;
    last_name: string;
    cedula?: string | null;
    rnc?: string | null;
    address: string;
    phone_number: string;
    active: boolean | number | string;
}

export default function Index({ clients }: { clients: Client[] }) {

    const formatCedula = (cedula: string) => {
        const clean = cedula.replace(/\D/g, '');
        if (clean.length === 11) {
            return `${clean.slice(0, 3)}-${clean.slice(3, 10)}-${clean.slice(10)}`;
        }
        return cedula;
    };

    const renderDocument = (client: Client) => {
        if (client.cedula) return formatCedula(client.cedula);
        if (client.rnc) return `RNC: ${client.rnc}`;
        return '-';
    };

    const handleDelete = (id: number) => {
        if (confirm('¿Estás seguro de que deseas eliminar este cliente?')) {
            router.delete(`/clients/${id}`);
        }
    };

    const handleRestore = (id: number) => {
        if (confirm('¿Deseas restaurar este cliente?')) {
            router.put(`/clients/${id}`, { active: true });
        }
    };

    return (
        <>
            <Head title="Clientes" />

            <div className="p-6 space-y-6">
                {/* Header de la vista */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-foreground">
                            Gestión de Clientes
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Administra y visualiza la lista de clientes registrados.
                        </p>
                    </div>

                    <Button asChild className="w-full sm:w-auto">
                        <Link href="/clients/create">
                            <Plus className="mr-2 h-4 w-4" />
                            Nuevo Cliente
                        </Link>
                    </Button>
                </div>

                {/* Tabla / Lista */}
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    {clients.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="w-[60px] text-center">#</TableHead>
                                    <TableHead>Nombre Completo</TableHead>
                                    <TableHead>Cédula / RNC</TableHead>
                                    <TableHead>Teléfono</TableHead>
                                    <TableHead>Dirección</TableHead>
                                    <TableHead className="text-center">Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {clients.map((client) => {
                                    const isActive = Boolean(client.active);

                                    return (
                                        <TableRow key={client.id} className="hover:bg-muted/30">
                                            <TableCell className="font-medium text-center text-muted-foreground">
                                                {client.id}
                                            </TableCell>
                                            <TableCell className="font-semibold text-foreground">
                                                {client.first_name} {client.last_name}
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {renderDocument(client)}
                                            </TableCell>
                                            <TableCell>{client.phone_number}</TableCell>
                                            <TableCell className="max-w-[200px] truncate" title={client.address}>
                                                {client.address}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={isActive ? "default" : "secondary"}>
                                                    {isActive ? 'Activo' : 'Inactivo'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Abrir menú</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Opciones</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem asChild className="cursor-pointer">
                                                            <Link href={`/clients/${client.id}/edit`}>
                                                                <Pencil className="mr-2 h-4 w-4" />
                                                                Editar
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem asChild className="cursor-pointer">
                                                            <Link href={`/clients/${client.id}/show`}>
                                                                <Eye className="mr-2 h-4 w-4" />
                                                                Show
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        {client.active ? (
                                                            <DropdownMenuItem
                                                                onClick={() => handleDelete(client.id)}
                                                                className="text-red-600 focus:text-red-600 cursor-pointer"
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Eliminar
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem
                                                                onClick={() => handleRestore(client.id)}
                                                                className="text-emerald-600 focus:text-emerald-600 cursor-pointer"
                                                            >
                                                                <RefreshCw className="mr-2 h-4 w-4" />
                                                                Restaurar
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    ) : (
                        /* Estado vacio */
                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                                <Users className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">No hay clientes registrados</h3>
                            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                                Comienza agregando tu primer cliente haciendo clic en el botón de arriba a la derecha.
                            </p>
                        </div>
                    )}
                </div>
            </div>
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
