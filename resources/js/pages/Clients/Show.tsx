import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

const formatCedula = (cedula: string) => {
    const clean = cedula.replace(/\D/g, '');

    if (clean.length === 11) {
        return `${clean.slice(0, 3)}-${clean.slice(3, 10)}-${clean.slice(10)}`;
    }

    return cedula;
};

export default function Show({ client }: { client: Client }) {
    const document = client.cedula
        ? formatCedula(client.cedula)
        : client.rnc
          ? `RNC: ${client.rnc}`
          : '—';

    return (
        <>
            <Head title={`${client.first_name} ${client.last_name}`} />

            <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
                <Card>
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div>
                            <CardTitle>
                                {client.first_name} {client.last_name}
                            </CardTitle>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Cliente #{client.id}
                            </p>
                        </div>
                        <Badge
                            variant={client.active ? 'default' : 'secondary'}
                        >
                            {client.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                            <div>
                                <dt className="text-muted-foreground">
                                    Documento
                                </dt>
                                <dd className="font-mono font-medium">
                                    {document}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">
                                    Teléfono
                                </dt>
                                <dd className="font-medium">
                                    {client.phone_number}
                                </dd>
                            </div>
                            <div className="sm:col-span-2">
                                <dt className="text-muted-foreground">
                                    Dirección
                                </dt>
                                <dd className="font-medium">
                                    {client.address}
                                </dd>
                            </div>
                        </dl>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" asChild>
                                <Link href="/clients">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Volver
                                </Link>
                            </Button>
                            <Button asChild>
                                <Link href={`/clients/${client.id}/edit`}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Editar
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
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
        {
            title: 'Detalle',
            href: '/clients',
        },
    ],
};
