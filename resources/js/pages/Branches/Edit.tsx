import { Head, useForm, Link } from '@inertiajs/react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import React, { useState } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Description } from '@radix-ui/react-dialog';

interface Branch {
    id: number;
    name: string;
    description: string;
    phone_number: string;
}

export default function Edit({branch}: {branch: Branch}) {
    const { data, setData, put, processing, errors, transform } = useForm({
        name: branch.name,
        description: branch.description,
        phone_number: branch.phone_number,
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        put(`/branches/${branch.id}`);
    };

    return (
        <>
            <Head title="Crear Surcusal" />

            <div className="flex min-h-[40vh] items-center justify-center p-4">
                <div className="w-full max-w-2xl rounded-xl border bg-card p-6 shadow-sm">
                    <h2 className="mb-6 text-xl font-bold text-foreground">
                        Editar Surcusal
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {/* Nombre */}
                            <div className="space-y-2">
                                <Label htmlFor="name">
                                    Nombre <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    placeholder="Bonao"
                                    value={data.name}
                                    onChange={e => setData('name', e.target.value)}
                                />
                                {errors.name && (
                                    <p className="text-sm text-red-500">{errors.name}</p>
                                )}
                            </div>

                            {/* Teléfono */}
                            <div className="space-y-2">
                                <Label htmlFor="phone_number">
                                    Teléfono <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="phone_number"
                                    placeholder="809-000-0000"
                                    value={data.phone_number}
                                    onChange={e => setData('phone_number', e.target.value)}
                                />
                                {errors.phone_number && (
                                    <p className="text-sm text-red-500">{errors.phone_number}</p>
                                )}
                            </div>
                        </div>

                        {/* Dirección */}
                        <div className="space-y-2">
                            <Label htmlFor="description">
                                Descripción
                            </Label>
                            <Textarea
                                id="description"
                                placeholder="Calle Duarte #12"
                                value={data.description}
                                onChange={e => setData('description', e.target.value)}
                            />
                            {errors.description && (
                                <p className="text-sm text-red-500">{errors.description}</p>
                            )}
                        </div>

                        {/* Botones de Acción */}
                        <div className="flex justify-end pt-2 gap-4">
                            <Button variant="outline" asChild className="w-full sm:w-auto">
                                <Link href="/branches">Cancelar</Link>
                            </Button>

                            <Button type="submit" disabled={processing} className="w-full sm:w-auto">
                                {processing ? 'Guardando...' : 'Guardar Cliente'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}

Edit.layout = {
    breadcrumbs: [
        {
            title: 'Edit Surcusal',
            href: '/branches/edit',
        },
    ],
};
