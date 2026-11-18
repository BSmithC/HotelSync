import { Head, Link, router } from '@inertiajs/react';
import {
    Building,
    Eye,
    MoreHorizontal,
    Pencil,
    Plus,
    RefreshCw,
    Trash2,
} from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface BuildingRow {
    id: number;
    name: string;
    address?: string | null;
    floors: number;
    active: boolean;
    branch?: { id: number; name: string } | null;
}

export default function Index({ buildings }: { buildings: BuildingRow[] }) {
    const handleDelete = (id: number) => {
        if (confirm('¿Deseas desactivar este edificio?')) {
            router.delete(`/buildings/${id}`);
        }
    };

    const handleRestore = (id: number) => {
        if (confirm('¿Deseas restaurar este edificio?')) {
            router.patch(`/buildings/${id}/restore`);
        }
    };

    return (
        <>
            <Head title="Edificios" />

            <div className="space-y-6 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-foreground">
                            Edificios
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Administra los edificios de cada sucursal del hotel.
                        </p>
                    </div>

                    <Button asChild className="w-full sm:w-auto">
                        <Link href="/buildings/create">
                            <Plus className="mr-2 h-4 w-4" />
                            Nuevo Edificio
                        </Link>
                    </Button>
                </div>

                <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                    {buildings.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="w-[60px] text-center">
                                        #
                                    </TableHead>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Sucursal</TableHead>
                                    <TableHead className="text-center">
                                        Pisos
                                    </TableHead>
                                    <TableHead>Dirección</TableHead>
                                    <TableHead className="text-center">
                                        Estado
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Acciones
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {buildings.map((building) => (
                                    <TableRow
                                        key={building.id}
                                        className="hover:bg-muted/30"
                                    >
                                        <TableCell className="text-center font-medium text-muted-foreground">
                                            {building.id}
                                        </TableCell>
                                        <TableCell className="font-semibold text-foreground">
                                            {building.name}
                                        </TableCell>
                                        <TableCell>
                                            {building.branch?.name ?? '—'}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {building.floors}
                                        </TableCell>
                                        <TableCell
                                            className="max-w-[220px] truncate"
                                            title={building.address ?? ''}
                                        >
                                            {building.address || '—'}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <StatusBadge
                                                status="Activo"
                                                active={building.active}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <span className="sr-only">
                                                            Abrir menú
                                                        </span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>
                                                        Opciones
                                                    </DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        asChild
                                                        className="cursor-pointer"
                                                    >
                                                        <Link
                                                            href={`/buildings/${building.id}/edit`}
                                                        >
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            Editar
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        asChild
                                                        className="cursor-pointer"
                                                    >
                                                        <Link
                                                            href={`/buildings/${building.id}`}
                                                        >
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            Ver detalle
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    {building.active ? (
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                handleDelete(
                                                                    building.id,
                                                                )
                                                            }
                                                            className="cursor-pointer text-red-600 focus:text-red-600"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Desactivar
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                handleRestore(
                                                                    building.id,
                                                                )
                                                            }
                                                            className="cursor-pointer text-emerald-600 focus:text-emerald-600"
                                                        >
                                                            <RefreshCw className="mr-2 h-4 w-4" />
                                                            Restaurar
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                <Building className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">
                                No hay edificios registrados
                            </h3>
                            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                                Registra el primer edificio y vincúlalo a una de
                                tus sucursales.
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
            title: 'Edificios',
            href: '/buildings',
        },
    ],
};
