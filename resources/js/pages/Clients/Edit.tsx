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


interface Client  {
    id: number;
    first_name: string;
    last_name: string;
    cedula: string;
    rnc: string;
    address: string;
    phone_number: string;
}

export default function Edit({client}: {client: Client}) {
    const [docType, setDocType] = useState<'cedula' | 'rnc'>('cedula');

    const { data, setData, put, processing, errors, transform } = useForm({
        first_name: client.first_name,
        last_name: client.last_name,
        cedula: client.cedula,
        rnc: client.rnc,
        address: client.address,
        phone_number: client.phone_number,
    });

    // Formatear la Cédula (402-0000000-0)
    const formatCedula = (value: string) => {
        const digits = value.replace(/\D/g, '').slice(0, 11);
        if (digits.length <= 3) return digits;
        if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
        return `${digits.slice(0, 3)}-${digits.slice(3, 10)}-${digits.slice(10)}`;
    };

    // Formatear el RNC (Máximo 11 dígitos)
    const formatRNC = (value: string) => {
        return value.replace(/\D/g, '').slice(0, 11);
    };

    const handleDocTypeChange = (type: 'cedula' | 'rnc') => {
        setDocType(type);
        if (type === 'cedula') {
            setData((prev) => ({ ...prev, rnc: '' }));
        } else {
            setData((prev) => ({ ...prev, cedula: '' }));
        }
    };

    const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        transform((prevData) => ({
            ...prevData,
            cedula: docType === 'cedula' && prevData.cedula ? prevData.cedula.replace(/\D/g, '') : null,
            rnc: docType === 'rnc' && prevData.rnc ? prevData.rnc.replace(/\D/g, '') : null,
        }));

        put(`/clients/${client.id}`);
    };

    return (
        <>
            <Head title="Crear Cliente" />

            <div className="flex min-h-[40vh] items-center justify-center p-4">
                <div className="w-full max-w-2xl rounded-xl border bg-card p-6 shadow-sm">
                    <h2 className="mb-6 text-xl font-bold text-foreground">
                        Editar Cliente
                    </h2>

                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {/* Nombre */}
                            <div className="space-y-2">
                                <Label htmlFor="first_name">
                                    Nombre <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="first_name"
                                    placeholder="Juan"
                                    value={data.first_name}
                                    onChange={e => setData('first_name', e.target.value)}
                                />
                                {errors.first_name && (
                                    <p className="text-sm text-red-500">{errors.first_name}</p>
                                )}
                            </div>

                            {/* Apellido */}
                            <div className="space-y-2">
                                <Label htmlFor="last_name">
                                    Apellido <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="last_name"
                                    placeholder="Pérez"
                                    value={data.last_name}
                                    onChange={e => setData('last_name', e.target.value)}
                                />
                                {errors.last_name && (
                                    <p className="text-sm text-red-500">{errors.last_name}</p>
                                )}
                            </div>

                            {/* Seleccionar Tipo de Documento */}
                            <div className="space-y-2">
                                <Label htmlFor="doc_type">Tipo de Documento</Label>
                                <Select
                                    value={docType}
                                    onValueChange={(val: 'cedula' | 'rnc') => handleDocTypeChange(val)}
                                >
                                    <SelectTrigger id="doc_type">
                                        <SelectValue placeholder="Selecciona un documento" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cedula">Cédula</SelectItem>
                                        <SelectItem value="rnc">RNC</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Input Dinámico (Cédula o RNC) */}
                            {docType === 'cedula' ? (
                                <div className="space-y-2">
                                    <Label htmlFor="cedula">
                                        Cédula <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="cedula"
                                        placeholder="402-0000000-0"
                                        value={data.cedula}
                                        onChange={(e) => setData('cedula', formatCedula(e.target.value))}
                                    />
                                    {errors.cedula && (
                                        <p className="text-sm text-red-500">{errors.cedula}</p>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label htmlFor="rnc">
                                        RNC <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="rnc"
                                        placeholder="101000000 o 40200000000"
                                        value={data.rnc}
                                        onChange={(e) => setData('rnc', formatRNC(e.target.value))}
                                    />
                                    {errors.rnc && (
                                        <p className="text-sm text-red-500">{errors.rnc}</p>
                                    )}
                                </div>
                            )}

                            {/* Teléfono */}
                            <div className="space-y-2 md:col-span-2">
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
                            <Label htmlFor="address">
                                Dirección <span className="text-red-500">*</span>
                            </Label>
                            <Textarea
                                id="address"
                                placeholder="Calle Duarte #12"
                                value={data.address}
                                onChange={e => setData('address', e.target.value)}
                            />
                            {errors.address && (
                                <p className="text-sm text-red-500">{errors.address}</p>
                            )}
                        </div>

                        {/* Botones de Acción */}
                        <div className="flex justify-end pt-2 gap-4">
                            <Button variant="outline" asChild className="w-full sm:w-auto">
                                <Link href="/clients">Cancelar</Link>
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
            title: 'Editar Clientes',
            href: '/clients/create',
        },
    ],
};
