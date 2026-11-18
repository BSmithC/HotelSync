import { Link } from '@inertiajs/react';
import { Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { RoomData } from '@/types';

type Props = {
    isOpen: boolean;
    room: RoomData | null;
    onClose: () => void;
};

export function RoomDetailsModal({ isOpen, room, onClose }: Props) {
    return (
        <Dialog
            open={isOpen && Boolean(room)}
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{room?.name ?? 'Habitación'}</DialogTitle>
                    <DialogDescription>
                        {room?.area?.name ?? 'Sin área asignada'}
                    </DialogDescription>
                </DialogHeader>

                {room && (
                    <dl className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <dt className="text-muted-foreground">Capacidad</dt>
                            <dd className="font-medium">
                                {room.capacity} huéspedes
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">Estado</dt>
                            <dd>
                                <Badge
                                    variant={
                                        room.active ? 'default' : 'secondary'
                                    }
                                >
                                    {room.active ? 'Activa' : 'Inactiva'}
                                </Badge>
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">Tarifa</dt>
                            <dd className="font-medium">
                                {room.price
                                    ? `RD$ ${Number(room.price).toFixed(2)}`
                                    : 'No definida'}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">Teléfono</dt>
                            <dd className="font-medium">{room.phone || '—'}</dd>
                        </div>
                        <div className="col-span-2">
                            <dt className="text-muted-foreground">
                                Descripción
                            </dt>
                            <dd className="font-medium">
                                {room.description || 'Sin descripción'}
                            </dd>
                        </div>
                    </dl>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cerrar
                    </Button>
                    {room && (
                        <Button asChild>
                            <Link href={`/rooms/${room.id}/edit`}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar habitación
                            </Link>
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
