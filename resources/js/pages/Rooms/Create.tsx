import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { AreaData } from '@/types';

type Props = {
    areas: AreaData[];
};

export default function Create({ areas }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        capacity: 2,
        shape: 'rectangle',
        area_id: areas[0] ? String(areas[0].id) : '',
    });

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        post('/rooms');
    };

    const renderShapePreview = () => {
        const baseStyles =
            'flex items-center justify-center border-2 border-primary bg-primary/10 text-xs font-semibold text-primary shadow-sm transition-all duration-300';

        switch (data.shape) {
            case 'rectangle':
                return (
                    <div className={`${baseStyles} h-36 w-64 rounded-lg`}>
                        Habitación (Rectangular)
                    </div>
                );
            case 'square':
                return (
                    <div className={`${baseStyles} h-44 w-44 rounded-lg`}>
                        Habitación (Cuadrada)
                    </div>
                );
            case 'circle':
                return (
                    <div className={`${baseStyles} h-44 w-44 rounded-full`}>
                        Habitación (Circular)
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <>
            <Head title="Nueva Habitación" />

            <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
                <div className="flex flex-col items-start gap-6 md:flex-row">
                    <div className="w-full rounded-2xl border bg-card p-6 text-card-foreground shadow-sm md:w-1/2">
                        <div className="mb-6 text-center">
                            <h2 className="text-xl font-semibold tracking-tight text-foreground">
                                Crear Habitación
                            </h2>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Completa los campos para registrar una nueva
                                habitación
                            </p>
                        </div>

                        {areas.length === 0 && (
                            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                                No hay áreas registradas. Crea un área desde la
                                vista de{' '}
                                <Link href="/rooms" className="underline">
                                    Habitaciones
                                </Link>{' '}
                                antes de continuar.
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label className="mb-1.5 block text-sm font-medium text-foreground">
                                    Nombre de la habitación
                                </Label>
                                <Input
                                    type="text"
                                    value={data.name}
                                    onChange={(event) =>
                                        setData('name', event.target.value)
                                    }
                                    placeholder="Ej. Suite Presidencial 101"
                                />
                                {errors.name && (
                                    <p className="mt-1 text-xs text-destructive">
                                        {errors.name}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <Label className="mb-1.5 block text-sm font-medium text-foreground">
                                        Capacidad
                                    </Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={data.capacity}
                                        onChange={(event) =>
                                            setData(
                                                'capacity',
                                                Number(event.target.value),
                                            )
                                        }
                                    />
                                    {errors.capacity && (
                                        <p className="mt-1 text-xs text-destructive">
                                            {errors.capacity}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <Label className="mb-1.5 block text-sm font-medium text-foreground">
                                        Forma
                                    </Label>
                                    <Select
                                        value={data.shape}
                                        onValueChange={(value) =>
                                            setData('shape', value)
                                        }
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Selecciona la forma" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="rectangle">
                                                Rectángulo
                                            </SelectItem>
                                            <SelectItem value="square">
                                                Cuadrado
                                            </SelectItem>
                                            <SelectItem value="circle">
                                                Círculo
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.shape && (
                                        <p className="mt-1 text-xs text-destructive">
                                            {errors.shape}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <Label className="mb-1.5 block text-sm font-medium text-foreground">
                                    Área
                                </Label>
                                <Select
                                    value={data.area_id}
                                    onValueChange={(value) =>
                                        setData('area_id', value)
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Selecciona un área" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {areas.map((area) => (
                                            <SelectItem
                                                key={area.id}
                                                value={String(area.id)}
                                            >
                                                {area.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.area_id && (
                                    <p className="mt-1 text-xs text-destructive">
                                        {errors.area_id}
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    asChild
                                    className="w-full"
                                >
                                    <Link href="/rooms">Cancelar</Link>
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={processing || areas.length === 0}
                                    className="w-full"
                                >
                                    {processing
                                        ? 'Guardando...'
                                        : 'Guardar Habitación'}
                                </Button>
                            </div>
                        </form>
                    </div>

                    <div className="flex w-full flex-col rounded-2xl border bg-card p-6 text-card-foreground shadow-sm md:w-1/2">
                        <div className="mb-6 text-center">
                            <h2 className="text-xl font-semibold tracking-tight text-foreground">
                                Vista previa
                            </h2>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Representación de la forma seleccionada
                            </p>
                        </div>

                        <div className="flex min-h-[300px] flex-1 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 p-6">
                            {renderShapePreview()}

                            <p className="mt-6 text-center text-xs text-muted-foreground">
                                Forma <strong>{data.shape}</strong> seleccionada
                                para la habitación.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

Create.layout = {
    breadcrumbs: [
        {
            title: 'Habitaciones',
            href: '/rooms',
        },
        {
            title: 'Nueva habitación',
            href: '/rooms/create',
        },
    ],
};
