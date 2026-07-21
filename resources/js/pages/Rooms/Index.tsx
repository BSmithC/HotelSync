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
import { Plus, MoreHorizontal, Pencil, Trash2, Users, RefreshCw, BedDouble } from 'lucide-react';

interface Room {
    id: number;
    room_number: string;
    description: string;
    active: boolean|string |number;
}

export default function Index({ rooms }: { rooms: Room[] }) {


    const handleDelete = (id: number) => {
        if (confirm('¿Estás seguro de que deseas eliminar esta habitación?')) {
            router.delete(`/rooms/${id}`);
        }
    };

    const handleRestore = (id: number) => {
        if (confirm('¿Deseas restaurar esta habitación?')) {
            router.put(`/rooms/${id}`, { active: true });
        }
    };

    return (
        <>
            <Head title="Habitaciones" />

            <div className="p-6 space-y-6">
                {/* Header de la vista */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-foreground">
                            Gestión de Habitaciónes
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Administra y visualiza la lista de habitaciónes registradas.
                        </p>
                    </div>

                    <Button asChild className="w-full sm:w-auto">
                        <Link href="/rooms/create">
                            <Plus className="mr-2 h-4 w-4" />
                            Nueva Habitación
                        </Link>
                    </Button>
                </div>

                {/* Tabla / Lista */}
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    {rooms.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="w-[60px] text-center">#</TableHead>
                                    <TableHead>Numero De La Habitación</TableHead>
                                    <TableHead>Descripción</TableHead>
                                    <TableHead className="text-center">Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rooms.map((room) => {
                                    const isActive = Boolean(room.active);

                                    return (
                                        <TableRow key={room.id} className="hover:bg-muted/30">
                                            <TableCell className="font-medium text-center text-muted-foreground">
                                                {room.id}
                                            </TableCell>
                                            <TableCell className="font-semibold text-foreground">
                                                {room.room_number}
                                            </TableCell>
                                            <TableCell>
                                                {room.description}
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
                                                            <Link href={`/rooms/${room.id}/edit`}>
                                                                <Pencil className="mr-2 h-4 w-4" />
                                                                Editar
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        {room.active ? (
                                                            <DropdownMenuItem
                                                                onClick={() => handleDelete(room.id)}
                                                                className="text-red-600 focus:text-red-600 cursor-pointer"
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Eliminar
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem
                                                                onClick={() => handleRestore(room.id)}
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
                                <BedDouble className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">No hay Habitaciones registradas</h3>
                            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                                Comienza agregando tu primer habitacion haciendo clic en el botón de arriba a la derecha.
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
            title: 'Habitaciones',
            href: '/rooms',
        },
    ],
};
