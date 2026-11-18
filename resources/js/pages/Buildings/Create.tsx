import { Head, useForm, Link } from '@inertiajs/react';
import React from 'react';
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
import { Textarea } from '@/components/ui/textarea';

interface Option {
    id: number;
    name: string;
}

export default function Create({ branches }: { branches: Option[] }) {
    const { data, setData, post, processing, errors, transform } = useForm({
        name: '',
        branch_id: 'none',
        address: '',
        floors: 1,
        description: '',
    });

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        transform((previous) => ({
            ...previous,
            branch_id:
                previous.branch_id === 'none' ? null : previous.branch_id,
        }));

        post('/buildings');
    };

    return (
        <>
            <Head title="Nuevo Edificio" />

            <div className="flex min-h-[40vh] items-center justify-center p-4">
                <div className="w-full max-w-2xl rounded-xl border bg-card p-6 shadow-sm">
                    <h2 className="mb-6 text-xl font-bold text-foreground">
                        Registrar Edificio
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="name">
                                    Nombre{' '}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    placeholder="Edificio A"
                                    value={data.name}
                                    onChange={(event) =>
                                        setData('name', event.target.value)
                                    }
                                />
                                {errors.name && (
                                    <p className="text-sm text-red-500">
                                        {errors.name}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="branch_id">Sucursal</Label>
                                <Select
                                    value={data.branch_id}
                                    onValueChange={(value) =>
                                        setData('branch_id', value)
                                    }
                                >
                                    <SelectTrigger id="branch_id">
                                        <SelectValue placeholder="Sin sucursal" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">
                                            Sin sucursal
                                        </SelectItem>
                                        {branches.map((branch) => (
                                            <SelectItem
                                                key={branch.id}
                                                value={String(branch.id)}
                                            >
                                                {branch.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.branch_id && (
                                    <p className="text-sm text-red-500">
                                        {errors.branch_id}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="floors">
                                    Pisos{' '}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="floors"
                                    type="number"
                                    min={1}
                                    value={data.floors}
                                    onChange={(event) =>
                                        setData(
                                            'floors',
                                            Number(event.target.value),
                                        )
                                    }
                                />
                                {errors.floors && (
                                    <p className="text-sm text-red-500">
                                        {errors.floors}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="address">Dirección</Label>
                                <Input
                                    id="address"
                                    placeholder="Av. Independencia 10"
                                    value={data.address}
                                    onChange={(event) =>
                                        setData('address', event.target.value)
                                    }
                                />
                                {errors.address && (
                                    <p className="text-sm text-red-500">
                                        {errors.address}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Descripción</Label>
                            <Textarea
                                id="description"
                                placeholder="Distribución o uso del edificio"
                                value={data.description}
                                onChange={(event) =>
                                    setData('description', event.target.value)
                                }
                            />
                            {errors.description && (
                                <p className="text-sm text-red-500">
                                    {errors.description}
                                </p>
                            )}
                        </div>

                        <div className="flex justify-end gap-4 pt-2">
                            <Button
                                variant="outline"
                                asChild
                                className="w-full sm:w-auto"
                            >
                                <Link href="/buildings">Cancelar</Link>
                            </Button>

                            <Button
                                type="submit"
                                disabled={processing}
                                className="w-full sm:w-auto"
                            >
                                {processing ? 'Guardando...' : 'Guardar'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}

Create.layout = {
    breadcrumbs: [
        {
            title: 'Edificios',
            href: '/buildings',
        },
        {
            title: 'Nuevo',
            href: '/buildings/create',
        },
    ],
};
