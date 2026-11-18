import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export type RoomAreaOption = {
    id: number;
    name: string;
};

type Props = {
    isOpen: boolean;
    areas: RoomAreaOption[];
    onClose: () => void;
};

const shapes = [
    { value: 'rectangle', label: 'Rectángulo' },
    { value: 'square', label: 'Cuadrado' },
    { value: 'circle', label: 'Círculo' },
];

export function CreateRoomModal({ isOpen, areas, onClose }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        capacity: 2,
        shape: 'rectangle',
        area_id: areas[0] ? String(areas[0].id) : '',
    });

    useEffect(() => {
        if (isOpen) {
            setData('area_id', areas[0] ? String(areas[0].id) : '');
        }
    }, [isOpen, areas, setData]);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        post('/rooms', {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    };

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Nueva habitación</DialogTitle>
                    <DialogDescription>
                        Registra una habitación en el área seleccionada.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="room-name">
                            Nombre de la habitación
                        </Label>
                        <Input
                            id="room-name"
                            value={data.name}
                            onChange={(event) =>
                                setData('name', event.target.value)
                            }
                            placeholder="Ej. Suite 101"
                        />
                        {errors.name && (
                            <p className="text-sm text-destructive">
                                {errors.name}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="room-capacity">Capacidad</Label>
                            <Input
                                id="room-capacity"
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
                                <p className="text-sm text-destructive">
                                    {errors.capacity}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="room-shape">Forma</Label>
                            <Select
                                value={data.shape}
                                onValueChange={(value) =>
                                    setData('shape', value)
                                }
                            >
                                <SelectTrigger id="room-shape">
                                    <SelectValue placeholder="Selecciona la forma" />
                                </SelectTrigger>
                                <SelectContent>
                                    {shapes.map((shape) => (
                                        <SelectItem
                                            key={shape.value}
                                            value={shape.value}
                                        >
                                            {shape.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.shape && (
                                <p className="text-sm text-destructive">
                                    {errors.shape}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="room-area">Área</Label>
                        <Select
                            value={data.area_id}
                            onValueChange={(value) => setData('area_id', value)}
                        >
                            <SelectTrigger id="room-area">
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
                            <p className="text-sm text-destructive">
                                {errors.area_id}
                            </p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={processing || areas.length === 0}
                        >
                            {processing ? 'Guardando...' : 'Guardar'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
