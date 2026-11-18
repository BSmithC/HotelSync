import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Pencil } from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Building {
    id: number;
    name: string;
    address?: string | null;
    floors: number;
    description?: string | null;
    active: boolean;
    branch?: { id: number; name: string } | null;
}

export default function Show({ building }: { building: Building }) {
    return (
        <>
            <Head title={building.name} />

            <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
                <Card>
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div>
                            <CardTitle>{building.name}</CardTitle>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Edificio #{building.id}
                            </p>
                        </div>
                        <StatusBadge status="Activo" active={building.active} />
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                            <div>
                                <dt className="text-muted-foreground">
                                    Sucursal
                                </dt>
                                <dd className="font-medium">
                                    {building.branch?.name ?? '—'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">Pisos</dt>
                                <dd className="font-medium">
                                    {building.floors}
                                </dd>
                            </div>
                            <div className="sm:col-span-2">
                                <dt className="text-muted-foreground">
                                    Dirección
                                </dt>
                                <dd className="font-medium">
                                    {building.address || '—'}
                                </dd>
                            </div>
                            <div className="sm:col-span-2">
                                <dt className="text-muted-foreground">
                                    Descripción
                                </dt>
                                <dd className="font-medium">
                                    {building.description || '—'}
                                </dd>
                            </div>
                        </dl>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" asChild>
                                <Link href="/buildings">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Volver
                                </Link>
                            </Button>
                            <Button asChild>
                                <Link href={`/buildings/${building.id}/edit`}>
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
            title: 'Edificios',
            href: '/buildings',
        },
        {
            title: 'Detalle',
            href: '/buildings',
        },
    ],
};
