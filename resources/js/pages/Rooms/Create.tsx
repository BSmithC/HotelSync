import { Head, Link, router, useForm, useState } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectItem, SelectTrigger, SelectValue, SelectContent } from '@/components/ui/select';

export default function Create() {
    const { data, setData, post, processing, errors } = useForm({
        name: "",
        capacity: 2,
        shape: "rectangle",
        area_id: "1",
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post('/rooms');
    };

    const renderShapePreview = () => {
        const baseStyles = "transition-all duration-300 border-2 border-primary bg-primary/10 shadow-sm flex items-center justify-center text-xs font-semibold text-primary";

        switch (data.shape) {
            case "rectangle":
                return (
                    <div className={`${baseStyles} w-64 h-36 rounded-lg`}>
                        Habitación (Rectangular)
                    </div>
                );
            case "square":
                return (
                    <div className={`${baseStyles} w-44 h-44 rounded-lg`}>
                        Habitación (Cuadrada)
                    </div>
                );
            case "circle":
                return (
                    <div className={`${baseStyles} w-44 h-44 rounded-full`}>
                        Habitación (Circular)
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 md:p-6">
            <div className="flex flex-col md:flex-row items-start gap-6">

                {/* TARJETA 1: Crear Habitación */}
                <div className="w-full md:w-1/2 rounded-2xl border bg-card text-card-foreground p-6 shadow-sm">
                    <div className="mb-6 text-center">
                        <h2 className="text-xl font-semibold tracking-tight text-foreground">
                            Crear Habitación
                        </h2>
                        <p className="text-xs text-muted-foreground mt-1">
                            Completa los campos para registrar una nueva habitación
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Nombre de la Habitación */}
                        <div>
                            <Label className="block text-sm font-medium mb-1.5 text-foreground">
                                Nombre de la habitación
                            </Label>
                            <Input
                                type="text"
                                value={data.name}
                                onChange={(e) => setData("name", e.target.value)}
                                placeholder="Ej. Suite Presidencial 101"
                            />
                            {errors.name && (
                                <p className="text-xs text-destructive mt-1">{errors.name}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {/* Capacidad */}
                            <div>
                                <Label className="block text-sm font-medium mb-1.5 text-foreground">
                                    Capacidad
                                </Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={data.capacity}
                                    onChange={(e) => setData("capacity", e.target.value)}
                                />
                                {errors.capacity && (
                                    <p className="text-xs text-destructive mt-1">{errors.capacity}</p>
                                )}
                            </div>

                            {/* Forma (Usando Shadcn Select) */}
                            <div>
                                <Label className="block text-sm font-medium mb-1.5 text-foreground">
                                    Forma
                                </Label>
                                <Select
                                    value={data.shape}
                                    onValueChange={(value) => setData("shape", value)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Selecciona la forma" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="rectangle">Rectángulo</SelectItem>
                                        <SelectItem value="square">Cuadrado</SelectItem>
                                        <SelectItem value="circle">Círculo</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.shape && (
                                    <p className="text-xs text-destructive mt-1">{errors.shape}</p>
                                )}
                            </div>
                        </div>

                        {/* ID de Área */}
                        <div>
                            <Label className="block text-sm font-medium mb-1.5 text-foreground">
                                Área
                            </Label>
                            <Select
                                value={String(data.area_id)}
                                onValueChange={(value) => setData("area_id", value)}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Selecciona un área" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">Área Principal (ID: 1)</SelectItem>
                                    <SelectItem value="2">Área VIP (ID: 2)</SelectItem>
                                </SelectContent>
                            </Select>

                            {errors.area_id && (
                                <p className="text-xs text-destructive mt-1">{errors.area_id}</p>
                            )}
                        </div>

                        {/* Botón de Enviar */}
                        <Button
                            type="submit"
                            disabled={processing}
                            className="w-full mt-2"
                        >
                            {processing ? "Guardando..." : "Guardar Habitación"}
                        </Button>
                    </form>
                </div>

                {/* TARJETA 2: Crear Cama y Vista Previa */}
                <div className="w-full md:w-1/2 rounded-2xl border bg-card text-card-foreground p-6 shadow-sm flex flex-col">
                    <div className="mb-6 text-center">
                        <h2 className="text-xl font-semibold tracking-tight text-foreground">
                            Crear Cama
                        </h2>
                        <p className="text-xs text-muted-foreground mt-1">
                            Distribución en la habitación
                        </p>
                    </div>

                    {/* Área de vista previa reactiva */}
                    <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] border border-dashed rounded-xl p-6 bg-muted/20">
                        {renderShapePreview()}

                        <p className="text-xs text-muted-foreground mt-6 text-center">
                            Aparece la forma <strong>{data.shape}</strong> seleccionada para colocar las camas.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}

Create.layout = {
    breadcrumbs: [
        {
            title: 'Habitacion',
            href: '/rooms',
        },
    ],
};
