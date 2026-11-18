import React, { useState, useRef } from 'react';
import { router } from '@inertiajs/react';
import { Bell } from 'lucide-react';
import Sidebar from '@/Components/Sidebar';
import { RoomDetailsModal, CreateRoomModal } from '@/Components/Modals';

// Interfaces actualizadas
interface AreaData {
    id: number;
    name: string;
    width: number;
    height: number;
}

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
    description: string;
    price: string;
    phone: string;
    status: string;
}

interface Props {
    areas: AreaData[];
    currentArea: AreaData;
    rooms: RoomData[];
}

export default function Index({ areas, currentArea, rooms }: Props) {
    const [selectedRoom, setSelectedRoom] = useState<RoomData | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Estados para modales
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);

    // Lógica Drag & Drop
    const handleMouseDown = (e: React.MouseEvent, room: RoomData) => {
        e.stopPropagation();
        setSelectedRoom(room);
        setIsDragging(true);
        setIsDetailsOpen(false); // Cerramos detalles si empieza a arrastrar

        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
            setDragOffset({
                x: e.clientX - (rect.left + room.pos_x),
                y: e.clientY - (rect.top + room.pos_y),
            });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !selectedRoom || !containerRef.current || !currentArea) return;

        const rect = containerRef.current.getBoundingClientRect();
        const newX = Math.max(0, Math.min(e.clientX - rect.left - dragOffset.x, currentArea.width - selectedRoom.width));
        const newY = Math.max(0, Math.min(e.clientY - rect.top - dragOffset.y, currentArea.height - selectedRoom.height));

        setSelectedRoom({ ...selectedRoom, pos_x: Math.round(newX), pos_y: Math.round(newY) });
    };

    const handleMouseUp = () => {
        if (isDragging && selectedRoom) {
            setIsDragging(false);
            // Guardar posición en backend
            router.patch(`/rooms/${selectedRoom.id}`, {
                pos_x: selectedRoom.pos_x,
                pos_y: selectedRoom.pos_y,
            }, { preserveScroll: true });
        }
    };

    // Lógica para abrir detalles al hacer clic sin arrastrar
    const handleRoomClick = (e: React.MouseEvent, room: RoomData) => {
        e.stopPropagation();
        if (!isDragging) {
            setSelectedRoom(room);
            setIsDetailsOpen(true);
        }
    };

    const changeFloor = (areaId: number) => {
        router.get('/rooms', { area_id: areaId }, { preserveState: true });
    };

    return (
        <div className="flex h-screen bg-white text-black font-sans">
            {/* Sidebar Izquierdo */}
            <Sidebar />

            {/* Contenido Principal */}
            <div className="flex-1 flex flex-col relative">

                {/* Topbar */}
                <header className="h-14 border-b flex items-center px-6 justify-between bg-white">
                    <div className="flex gap-4">
                        <button className="border border-black px-4 py-1 rounded-xl">Sucursal</button>
                        <button className="border border-black px-4 py-1 rounded-xl">Edificio</button>
                    </div>
                    <div className="relative cursor-pointer">
                        <Bell className="h-6 w-6" />
                        <span className="absolute -top-1 -right-1 bg-red-500 rounded-full w-3 h-3 border-2 border-white"></span>
                    </div>
                </header>

                {/* Área de Trabajo */}
                <main className="flex-1 p-4 flex flex-col gap-4">

                    {/* Barra de herramientas */}
                    <div className="flex justify-between items-center bg-white">
                        <h1 className="text-xl font-medium">Habitaciones</h1>
                        <div className="flex gap-2">
                            <button className="border border-black px-4 py-1.5 rounded-lg text-sm hover:bg-gray-50">Cancelar -</button>
                            <button
                                className="border border-black px-4 py-1.5 rounded-lg text-sm hover:bg-gray-50"
                                onClick={() => setIsCreateOpen(true)}
                            >
                                Nueva Habitacion +
                            </button>
                            <button className="border border-black px-4 py-1.5 rounded-lg text-sm hover:bg-gray-50">Nuevos Cama +</button>
                        </div>
                    </div>

                    <div className="flex flex-1 gap-4 overflow-hidden">
                        {/* Canvas */}
                        <div className="flex-1 bg-white border-2 border-black rounded-xl overflow-auto relative flex justify-center items-center">
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
                                    className="relative bg-white border border-gray-200 mx-auto"
                                >
                                    {/* Lineas divisoras como en el wireframe (opcional visual) */}
                                    <div className="absolute inset-y-0 left-1/3 w-px bg-black"></div>
                                    <div className="absolute inset-y-0 right-1/3 w-px bg-black"></div>
                                    <div className="absolute inset-x-0 top-1/3 h-px bg-black"></div>
                                    <div className="absolute inset-x-0 bottom-1/3 h-px bg-black"></div>

                                    {rooms?.map((room) => {
                                        const isSelected = selectedRoom?.id === room.id;
                                        const currentRoom = isSelected ? selectedRoom : room;

                                        return (
                                            <div
                                                key={room.id}
                                                onMouseDown={(e) => handleMouseDown(e, room)}
                                                onClick={(e) => handleRoomClick(e, room)}
                                                style={{
                                                    left: `${currentRoom.pos_x || 0}px`,
                                                    top: `${currentRoom.pos_y || 0}px`,
                                                    width: `${currentRoom.width || 60}px`,
                                                    height: `${currentRoom.height || 100}px`,
                                                }}
                                                className={`absolute border-2 border-black rounded-xl cursor-grab active:cursor-grabbing flex justify-center items-start pt-2 bg-white transition-shadow ${
                                                    isSelected ? 'ring-2 ring-blue-400 z-20' : 'z-10'
                                                }`}
                                            >
                                                {/* Representación visual de la cama (cuadrito dentro de la habitación) */}
                                                <div className="w-8 h-4 border border-black rounded-sm mt-1"></div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-gray-500">Selecciona o crea un piso para comenzar.</p>
                            )}
                        </div>

                        {/* Panel Lateral Derecho (Pisos) */}
                        <div className="w-32 border-2 border-black rounded-xl p-4 flex flex-col items-center gap-4 bg-white">
                            <h3 className="font-medium">Pisos</h3>
                            {areas.map((area) => (
                                <button
                                    key={area.id}
                                    onClick={() => changeFloor(area.id)}
                                    className={`w-full border-2 border-black py-1.5 rounded-lg text-sm transition-colors ${
                                        currentArea?.id === area.id ? 'bg-gray-200 font-bold' : 'hover:bg-gray-50'
                                    }`}
                                >
                                    {area.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </main>

                {/* Modales Flotantes */}
                <RoomDetailsModal
                    isOpen={isDetailsOpen}
                    room={selectedRoom}
                    onClose={() => setIsDetailsOpen(false)}
                />

                <CreateRoomModal
                    isOpen={isCreateOpen}
                    areas={areas}
                    onClose={() => setIsCreateOpen(false)}
                />
            </div>
        </div>
    );
}
