import React, { useState, useRef } from 'react';
import { useForm, router } from '@inertiajs/react';
import { Plus, Move, RotateCw, Maximize2, Trash2 } from 'lucide-react';

interface RoomData {
    id: number;
    name: string;
    capacity: number;
    area_id: number;
    pos_x: number;
    pos_y: number;
    width: number;
    height: number;
    rotation: number;
    shape: string;
    active: boolean;
}

interface AreaData {
    id: number;
    name: string;
    width: number;
    height: number;
}

interface Props {
    area: AreaData;
    rooms: RoomData[];
}

export default function Index({ area, rooms }: Props) {
    const [selectedRoom, setSelectedRoom] = useState<RoomData | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    // Formulario para guardar / actualizar posiciones
    const handleMouseDown = (e: React.MouseEvent, room: RoomData) => {
        e.stopPropagation();
        setSelectedRoom(room);
        setIsDragging(true);

        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
            setDragOffset({
                x: e.clientX - (rect.left + room.pos_x),
                y: e.clientY - (rect.top + room.pos_y),
            });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !selectedRoom || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const newX = Math.max(0, Math.min(e.clientX - rect.left - dragOffset.x, area.width - selectedRoom.width));
        const newY = Math.max(0, Math.min(e.clientY - rect.top - dragOffset.y, area.height - selectedRoom.height));

        // Actualización local rápida para fluidez
        setSelectedRoom({ ...selectedRoom, pos_x: Math.round(newX), pos_y: Math.round(newY) });
    };

    const handleMouseUp = () => {
        if (isDragging && selectedRoom) {
            setIsDragging(false);
            // Guardar cambios en el backend de Laravel
            router.patch(`/rooms/${selectedRoom.id}`, {
                pos_x: selectedRoom.pos_x,
                pos_y: selectedRoom.pos_y,
                width: selectedRoom.width,
                height: selectedRoom.height,
                rotation: selectedRoom.rotation,
            }, { preserveScroll: true });
        }
    };

    return (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden p-4 space-y-4">
            {/* Barra de herramientas superior */}
            <div className="flex items-center justify-between border-b pb-3">
                <div>
                    <h2 className="text-lg font-semibold">
                        Habitaciones
                    </h2>
                    <p className="text-xs text-muted-foreground">
                        Administra y visualiza la lista de habitaciones registrados.
                    </p>
                </div>

                {selectedRoom && (
                    <div className="flex items-center gap-2 text-sm bg-muted px-3 py-1.5 rounded-lg">
                        <span className="font-medium text-foreground">{selectedRoom.name}</span>
                        <span className="text-xs text-muted-foreground">
                            (X: {selectedRoom.pos_x}px, Y: {selectedRoom.pos_y}px)
                        </span>
                    </div>
                )}
            </div>

            {/* Canvas / Plano 2D */}
            <div className="overflow-auto max-h-[600px] flex justify-center bg-slate-950/5 p-4 rounded-lg">
                <div
                    ref={containerRef}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    style={{
                        width: `${area.width}px`,
                        height: `${area.height}px`,
                        backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
                        backgroundSize: '20px 20px',
                    }}
                    className="relative bg-background border-2 border-dashed border-primary/40 rounded-md shadow-inner select-none transition-all"
                >
                    {/* Renderizado de las habitaciones */}
                    {rooms?.map((room) => {
                        const isSelected = selectedRoom?.id === room.id;
                        const currentRoom = isSelected ? selectedRoom : room;

                        return (
                            <div
                                key={room.id}
                                onMouseDown={(e) => handleMouseDown(e, room)}
                                style={{
                                    left: `${currentRoom.pos_x || 0}px`,
                                    top: `${currentRoom.pos_y || 0}px`,
                                    width: `${currentRoom.width || 120}px`,
                                    height: `${currentRoom.height || 100}px`,
                                    transform: `rotate(${currentRoom.rotation || 0}deg)`,
                                }}
                                className={`absolute rounded-lg border-2 p-2 cursor-grab active:cursor-grabbing flex flex-col justify-between transition-shadow ${isSelected
                                    ? 'border-primary bg-primary/10 shadow-lg ring-2 ring-primary/30 z-20'
                                    : 'border-slate-300 bg-card hover:border-slate-400 z-10'
                                    }`}
                            >
                                {/* Cabecera de la habitación */}
                                <div className="flex justify-between items-start">
                                    <span className="text-xs font-bold truncate text-foreground">
                                        {room.name}
                                    </span>
                                    <Move className="h-3 w-3 text-muted-foreground opacity-60" />
                                </div>

                                {/* Detalles / Capacidad */}
                                <div className="text-[10px] text-muted-foreground font-mono">
                                    Cap: {room.capacity} pers.
                                </div>

                                {/* Indicador visual de selección */}
                                {isSelected && (
                                    <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-0.5">
                                        <Maximize2 className="h-3 w-3" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

Index.layout = {
    breadcrumbs: [
        {
            title: 'Habitaciones',
            href: '/rooms',
        },
    ],
};
