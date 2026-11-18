import { Head, router } from '@inertiajs/react';
import { Building2, Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import { CreateAreaModal } from '@/components/rooms/create-area-modal';
import { CreateRoomModal } from '@/components/rooms/create-room-modal';
import { RoomDetailsModal } from '@/components/rooms/room-details-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { AreaData, RoomData } from '@/types';

type Props = {
    areas: AreaData[];
    currentArea: AreaData | null;
    rooms: RoomData[];
};

export default function Index({ areas, currentArea, rooms }: Props) {
    const [selectedRoom, setSelectedRoom] = useState<RoomData | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
    const [isCreateAreaOpen, setIsCreateAreaOpen] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const dragOffset = useRef({ x: 0, y: 0 });
    const didDrag = useRef(false);

    const handleMouseDown = (
        event: React.MouseEvent<HTMLDivElement>,
        room: RoomData,
    ) => {
        const rect = containerRef.current?.getBoundingClientRect();

        if (!rect) {
            return;
        }

        event.stopPropagation();
        setSelectedRoom(room);
        setIsDragging(true);
        setIsDetailsOpen(false);
        didDrag.current = false;

        dragOffset.current = {
            x: event.clientX - (rect.left + (room.pos_x ?? 0)),
            y: event.clientY - (rect.top + (room.pos_y ?? 0)),
        };
    };

    const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
        if (
            !isDragging ||
            !selectedRoom ||
            !containerRef.current ||
            !currentArea
        ) {
            return;
        }

        const rect = containerRef.current.getBoundingClientRect();
        const newX = Math.max(
            0,
            Math.min(
                event.clientX - rect.left - dragOffset.current.x,
                currentArea.width - (selectedRoom.width || 60),
            ),
        );
        const newY = Math.max(
            0,
            Math.min(
                event.clientY - rect.top - dragOffset.current.y,
                currentArea.height - (selectedRoom.height || 60),
            ),
        );

        if (
            Math.abs(newX - (selectedRoom.pos_x ?? 0)) > 2 ||
            Math.abs(newY - (selectedRoom.pos_y ?? 0)) > 2
        ) {
            didDrag.current = true;
        }

        setSelectedRoom({
            ...selectedRoom,
            pos_x: Math.round(newX),
            pos_y: Math.round(newY),
        });
    };

    const handleMouseUp = () => {
        if (!isDragging) {
            return;
        }

        setIsDragging(false);

        if (didDrag.current && selectedRoom) {
            router.patch(
                `/rooms/${selectedRoom.id}`,
                {
                    pos_x: selectedRoom.pos_x,
                    pos_y: selectedRoom.pos_y,
                },
                { preserveScroll: true, preserveState: true },
            );
        }
    };

    const handleRoomClick = (
        event: React.MouseEvent<HTMLDivElement>,
        room: RoomData,
    ) => {
        event.stopPropagation();

        if (didDrag.current) {
            didDrag.current = false;

            return;
        }

        setSelectedRoom(room);
        setIsDetailsOpen(true);
    };

    const changeFloor = (areaId: number) => {
        router.get(
            '/rooms',
            { area_id: areaId },
            { preserveState: true, preserveScroll: true },
        );
    };

    return (
        <>
            <Head title="Habitaciones" />

            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">
                            Habitaciones
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Arrastra una habitación para guardar su posición en
                            el plano. Haz clic para ver sus detalles.
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsCreateAreaOpen(true)}
                        >
                            <Building2 className="mr-2 h-4 w-4" />
                            Nueva área
                        </Button>
                        <Button
                            onClick={() => setIsCreateRoomOpen(true)}
                            disabled={areas.length === 0}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Nueva habitación
                        </Button>
                    </div>
                </div>

                <div className="flex flex-1 flex-col gap-4 lg:flex-row">
                    <Card className="relative flex min-h-[420px] flex-1 items-center justify-center overflow-auto p-4">
                        {currentArea ? (
                            <div
                                ref={containerRef}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                                style={{
                                    width: `${currentArea.width}px`,
                                    height: `${currentArea.height}px`,
                                }}
                                className="relative shrink-0 rounded-lg border border-dashed bg-muted/20"
                            >
                                {rooms.length === 0 && (
                                    <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                                        No hay habitaciones en esta área.
                                    </p>
                                )}

                                {rooms.map((room) => {
                                    const isSelected =
                                        selectedRoom?.id === room.id;
                                    const currentRoom = isSelected
                                        ? (selectedRoom ?? room)
                                        : room;

                                    return (
                                        <div
                                            key={room.id}
                                            onMouseDown={(event) =>
                                                handleMouseDown(event, room)
                                            }
                                            onClick={(event) =>
                                                handleRoomClick(event, room)
                                            }
                                            title={room.name}
                                            style={{
                                                left: `${currentRoom.pos_x ?? 0}px`,
                                                top: `${currentRoom.pos_y ?? 0}px`,
                                                width: `${currentRoom.width || 60}px`,
                                                height: `${currentRoom.height || 60}px`,
                                            }}
                                            className={`absolute flex cursor-grab flex-col items-center justify-start gap-1 rounded-lg border-2 bg-card p-1 text-center transition-shadow active:cursor-grabbing ${
                                                isSelected
                                                    ? 'z-20 border-primary ring-2 ring-primary/30'
                                                    : 'z-10 border-border'
                                            }`}
                                        >
                                            <span className="w-full truncate text-[10px] font-medium">
                                                {room.name}
                                            </span>
                                            <Badge
                                                variant={
                                                    room.active
                                                        ? 'default'
                                                        : 'secondary'
                                                }
                                                className="px-1 py-0 text-[9px]"
                                            >
                                                {room.status}
                                            </Badge>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-3 text-center">
                                <p className="text-sm text-muted-foreground">
                                    Todavía no hay áreas registradas. Crea la
                                    primera para empezar a ubicar habitaciones.
                                </p>
                                <Button
                                    onClick={() => setIsCreateAreaOpen(true)}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Crear área
                                </Button>
                            </div>
                        )}
                    </Card>

                    <Card className="flex w-full shrink-0 flex-col gap-2 p-4 lg:w-44">
                        <h2 className="text-sm font-semibold">Áreas</h2>
                        {areas.map((area) => (
                            <Button
                                key={area.id}
                                variant={
                                    currentArea?.id === area.id
                                        ? 'default'
                                        : 'outline'
                                }
                                className="justify-start"
                                onClick={() => changeFloor(area.id)}
                            >
                                {area.name}
                            </Button>
                        ))}
                        {areas.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                                Sin áreas registradas.
                            </p>
                        )}
                    </Card>
                </div>
            </div>

            <RoomDetailsModal
                isOpen={isDetailsOpen}
                room={selectedRoom}
                onClose={() => setIsDetailsOpen(false)}
            />

            <CreateRoomModal
                isOpen={isCreateRoomOpen}
                areas={areas}
                onClose={() => setIsCreateRoomOpen(false)}
            />

            <CreateAreaModal
                isOpen={isCreateAreaOpen}
                onClose={() => setIsCreateAreaOpen(false)}
            />
        </>
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
