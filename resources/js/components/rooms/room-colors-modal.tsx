import { useForm } from '@inertiajs/react';
import { RotateCcw } from 'lucide-react';
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
    DEFAULT_ROOM_STATUS_COLORS,
    ROOM_STATUS_KEYS,
    roomStatusLabel,
} from '@/lib/room-status';
import type { RoomStatusColors } from '@/types';

/**
 * Per-hotel palette for the operational room states.
 *
 * Stored in `hotels.settings` and shared back through Inertia so the map,
 * the panel and reception always agree.
 */
export function RoomColorsModal({
    open,
    colors,
    onClose,
}: {
    open: boolean;
    colors: RoomStatusColors;
    onClose: () => void;
}) {
    const { data, setData, patch, processing, errors, reset } = useForm<{
        room_status_colors: RoomStatusColors;
    }>({
        room_status_colors: { ...colors },
    });

    useEffect(() => {
        if (open) {
            setData('room_status_colors', { ...colors });
        }

        return () => reset();
    }, [colors, open, reset, setData]);

    const updateColor = (key: keyof RoomStatusColors, value: string) => {
        setData('room_status_colors', {
            ...data.room_status_colors,
            [key]: value,
        });
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        patch('/hotels/current/settings', {
            preserveScroll: true,
            onSuccess: () => onClose(),
        });
    };

    const errorMessage = Object.values(errors)[0];

    return (
        <Dialog
            open={open}
            onOpenChange={(value) => {
                if (!value) {
                    onClose();
                }
            }}
        >
            <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Colores de estado</DialogTitle>
                    <DialogDescription>
                        Esta paleta se usa en el plano, en el panel de detalles
                        y en recepción para el hotel actual.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-3">
                        {ROOM_STATUS_KEYS.map((key) => {
                            const value = data.room_status_colors[key];
                            const validHex = /^#[0-9a-fA-F]{6}$/.test(value);

                            return (
                                <div
                                    key={key}
                                    className="flex items-center gap-3 rounded-lg border p-2.5"
                                >
                                    <span
                                        className="size-8 shrink-0 rounded-md border"
                                        style={{
                                            backgroundColor: value,
                                        }}
                                        aria-hidden="true"
                                    />
                                    <Label
                                        htmlFor={`room-color-${key}`}
                                        className="w-28 shrink-0"
                                    >
                                        {roomStatusLabel(key)}
                                    </Label>
                                    <input
                                        id={`room-color-${key}`}
                                        type="color"
                                        value={validHex ? value : '#000000'}
                                        onChange={(event) =>
                                            updateColor(key, event.target.value)
                                        }
                                        className="h-9 w-12 cursor-pointer rounded border bg-background p-1"
                                        aria-label={`Color de ${roomStatusLabel(key)}`}
                                    />
                                    <Input
                                        value={value}
                                        onChange={(event) =>
                                            updateColor(key, event.target.value)
                                        }
                                        className="font-mono text-xs uppercase"
                                        maxLength={7}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {errorMessage && (
                        <p className="text-sm text-destructive">
                            {errorMessage}
                        </p>
                    )}

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                            setData('room_status_colors', {
                                ...DEFAULT_ROOM_STATUS_COLORS,
                            })
                        }
                    >
                        <RotateCcw className="size-4" />
                        Restaurar paleta por defecto
                    </Button>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={processing}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Guardando...' : 'Guardar colores'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
