import { Head, Link, router, useForm } from '@inertiajs/react';
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
import { useState } from 'react';

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

export default function Show({ client }: { client: Client[] }) {
    const [docType, setDocType] = useState<'cedula' | 'rnc'>('cedula');

    const {data, setData, get} = useForm({
        first_name: client.first_name,
        last_name: client.last_name,
        cedula: client.cedula,
        rnc: client.rnc,
        address: client.address,
        phone_number: client.phone_number,
    });


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
                </div>
            </div>
        </>
    );
}

Show.layout = {
    breadcrumbs: [
        {
            title: 'Clientes',
            href: '/clients',
        },
    ],
};
