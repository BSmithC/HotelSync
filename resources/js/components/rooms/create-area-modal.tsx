import { useForm } from '@inertiajs/react';
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

type Props = {
    isOpen: boolean;
    onClose: () => void;
};

export function CreateAreaModal({ isOpen, onClose }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        x: 0,
        y: 0,
        width: 800,
        height: 600,
    });

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        post('/areas', {
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
                    <DialogTitle>Nueva área</DialogTitle>
                    <DialogDescription>
                        Define un área o piso para colocar habitaciones.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="area-name">Nombre</Label>
                        <Input
                            id="area-name"
                            value={data.name}
                            onChange={(event) =>
                                setData('name', event.target.value)
                            }
                            placeholder="Ej. Planta baja"
                        />
                        {errors.name && (
                            <p className="text-sm text-destructive">
                                {errors.name}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="area-width">Ancho (px)</Label>
                            <Input
                                id="area-width"
                                type="number"
                                min={100}
                                value={data.width}
                                onChange={(event) =>
                                    setData('width', Number(event.target.value))
                                }
                            />
                            {errors.width && (
                                <p className="text-sm text-destructive">
                                    {errors.width}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="area-height">Alto (px)</Label>
                            <Input
                                id="area-height"
                                type="number"
                                min={100}
                                value={data.height}
                                onChange={(event) =>
                                    setData(
                                        'height',
                                        Number(event.target.value),
                                    )
                                }
                            />
                            {errors.height && (
                                <p className="text-sm text-destructive">
                                    {errors.height}
                                </p>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Guardando...' : 'Crear área'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
