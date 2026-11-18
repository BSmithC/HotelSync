import { Head, router, usePage } from '@inertiajs/react';
import { BedDouble, Info, Pencil, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AreaFormModal } from '@/components/rooms/area-form-modal';
import { CreateRoomModal } from '@/components/rooms/create-room-modal';
import { HotelMap } from '@/components/rooms/hotel-map';
import { MapToolbar } from '@/components/rooms/map-toolbar';
import { RoomColorsModal } from '@/components/rooms/room-colors-modal';
import { RoomDetailsPanel } from '@/components/rooms/room-details-panel';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/use-permissions';
import type {
    AreaData,
    RoomData,
    RoomDetails,
    RoomPanelOptions,
    RoomSharedProps,
} from '@/types';

type Props = RoomPanelOptions & {
    areas: AreaData[];
    rooms: RoomData[];
    buildings: { id: number; name: string }[];
};

type LayoutDraft = {
    areas: AreaData[];
    rooms: RoomData[];
};

/**
 * Applies the unsaved geometry over the data stored on the server.
 *
 * Entities created while editing (a new room or area) arrive with the server
 * props and are kept, while draft entries with the same id override them.
 */
function applyDraft<T extends { id: number }>(
    server: T[],
    draft: T[] | null,
): T[] {
    if (draft === null) {
        return server;
    }

    const merged = new Map(server.map((item) => [item.id, item]));

    for (const item of draft) {
        merged.set(item.id, item);
    }

    return [...merged.values()];
}

export default function Index({
    areas,
    rooms,
    buildings,
    roomsForAssignment,
    roomsForIncidents,
    reservationsForIncidents,
    roomStatuses,
    incidentTypes,
    incidentSeverities,
}: Props) {
    const { roomStatusColors } = usePage<RoomSharedProps>().props;
    const { can } = usePermissions();

    const canLayout = can('rooms.layout');
    const canManage = can('rooms.manage');

    const [draft, setDraft] = useState<LayoutDraft | null>(null);
    const [editing, setEditing] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [layoutError, setLayoutError] = useState<string | null>(null);
    const [showGrid, setShowGrid] = useState(true);

    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [areaFilter, setAreaFilter] = useState('all');

    const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
    const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
    const [panelOpen, setPanelOpen] = useState(false);
    const [details, setDetails] = useState<RoomDetails | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const [createRoomOpen, setCreateRoomOpen] = useState(false);
    const [areaModal, setAreaModal] = useState<{
        open: boolean;
        area: AreaData | null;
    }>({ open: false, area: null });
    const [colorsOpen, setColorsOpen] = useState(false);

    const areasData = useMemo(
        () => (editing ? applyDraft(areas, draft?.areas ?? null) : areas),
        [areas, draft, editing],
    );

    const roomsData = useMemo(
        () => (editing ? applyDraft(rooms, draft?.rooms ?? null) : rooms),
        [rooms, draft, editing],
    );

    useEffect(() => {
        if (!panelOpen || selectedRoomId === null) {
            return;
        }

        const controller = new AbortController();

        fetch(`/rooms/${selectedRoomId}/details`, {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(
                        `No se pudo cargar la habitación (${response.status}).`,
                    );
                }

                return response.json() as Promise<{ room: RoomDetails }>;
            })
            .then((payload) => {
                setDetails(payload.room);
            })
            .catch(() => {
                if (!controller.signal.aborted) {
                    setDetails(null);
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoadingDetails(false);
                }
            });

        return () => controller.abort();
    }, [panelOpen, selectedRoomId, refreshKey]);

    const selectedRoom = useMemo(
        () => roomsData.find((room) => room.id === selectedRoomId) ?? null,
        [roomsData, selectedRoomId],
    );

    const selectedArea = useMemo(
        () => areasData.find((area) => area.id === selectedAreaId) ?? null,
        [areasData, selectedAreaId],
    );

    const counts = useMemo(() => {
        return roomsData.reduce<Record<string, number>>((accumulator, room) => {
            accumulator[room.status] = (accumulator[room.status] ?? 0) + 1;

            return accumulator;
        }, {});
    }, [roomsData]);

    const visibleRooms = useMemo(() => {
        const term = search.trim().toLowerCase();

        return roomsData.filter((room) => {
            const matchesSearch =
                term === '' || room.name.toLowerCase().includes(term);
            const matchesStatus = status === '' || room.status === status;
            const matchesArea =
                areaFilter === 'all' || room.area_id === Number(areaFilter);

            return matchesSearch && matchesStatus && matchesArea;
        });
    }, [roomsData, search, status, areaFilter]);

    const updateRoom = (
        id: number,
        patch: Partial<Pick<RoomData, 'pos_x' | 'pos_y' | 'width' | 'height'>>,
    ) => {
        setDraft((current) => {
            const base = {
                areas: applyDraft(areas, current?.areas ?? null),
                rooms: applyDraft(rooms, current?.rooms ?? null),
            };

            return {
                ...base,
                rooms: base.rooms.map((room) =>
                    room.id === id ? { ...room, ...patch } : room,
                ),
            };
        });
        setDirty(true);
    };

    const updateArea = (
        id: number,
        patch: Partial<Pick<AreaData, 'x' | 'y' | 'width' | 'height'>>,
    ) => {
        setDraft((current) => {
            const base = {
                areas: applyDraft(areas, current?.areas ?? null),
                rooms: applyDraft(rooms, current?.rooms ?? null),
            };

            return {
                ...base,
                areas: base.areas.map((area) =>
                    area.id === id ? { ...area, ...patch } : area,
                ),
            };
        });
        setDirty(true);
    };

    const selectRoom = (room: RoomData) => {
        setSelectedRoomId(room.id);

        if (!editing) {
            setDetails(null);
            setLoadingDetails(true);
            setPanelOpen(true);
        }
    };

    const closePanel = () => {
        setPanelOpen(false);
        setSelectedRoomId(null);
        setDetails(null);
        setLoadingDetails(false);
    };

    const startEdit = () => {
        setDraft(null);
        setEditing(true);
        setDirty(false);
        setLayoutError(null);
        setPanelOpen(false);
        setSelectedRoomId(null);
        setDetails(null);
        setLoadingDetails(false);
        setSelectedAreaId(null);
    };

    const cancelEdit = () => {
        setDraft(null);
        setEditing(false);
        setDirty(false);
        setLayoutError(null);
        setSelectedAreaId(null);
    };

    const saveLayout = () => {
        router.put(
            '/rooms/layout',
            {
                areas: areasData.map((area) => ({
                    id: area.id,
                    x: area.x,
                    y: area.y,
                    width: area.width,
                    height: area.height,
                    type: area.type,
                    color: area.color,
                    floor: area.floor,
                    building_id: area.building_id,
                    active: area.active,
                })),
                rooms: roomsData.map((room) => ({
                    id: room.id,
                    area_id: room.area_id,
                    pos_x: room.pos_x,
                    pos_y: room.pos_y,
                    width: room.width,
                    height: room.height,
                    rotation: room.rotation,
                })),
            },
            {
                preserveScroll: true,
                onStart: () => setSaving(true),
                onError: (errors) => {
                    setLayoutError(
                        Object.values(errors)[0] ??
                            'No se pudo guardar el plano.',
                    );
                },
                onSuccess: () => {
                    setEditing(false);
                    setDraft(null);
                    setDirty(false);
                    setLayoutError(null);
                },
                onFinish: () => setSaving(false),
            },
        );
    };

    const options: RoomPanelOptions = {
        roomsForAssignment,
        roomsForIncidents,
        reservationsForIncidents,
        roomStatuses,
        incidentTypes,
        incidentSeverities,
    };

    return (
        <>
            <Head title="Habitaciones" />

            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">
                            Habitaciones
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {editing
                                ? 'Modo edición: arrastra áreas y habitaciones, redimensiona desde la esquina y guarda los cambios.'
                                : 'Explora el plano del hotel. Haz clic en una habitación para ver su información y operar según tu rol.'}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {roomsData.length} habitaciones · {areasData.length}{' '}
                            áreas
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {editing && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                                <Pencil className="size-3.5" />
                                Editando plano
                            </span>
                        )}
                        {canManage && (
                            <Button
                                onClick={() => setCreateRoomOpen(true)}
                                disabled={areasData.length === 0}
                            >
                                <Plus className="size-4" />
                                Nueva habitación
                            </Button>
                        )}
                    </div>
                </div>

                <MapToolbar
                    search={search}
                    onSearchChange={setSearch}
                    status={status}
                    onStatusChange={setStatus}
                    counts={counts}
                    colors={roomStatusColors}
                    areas={areasData}
                    areaFilter={areaFilter}
                    onAreaFilterChange={setAreaFilter}
                    showGrid={showGrid}
                    onToggleGrid={() => setShowGrid((value) => !value)}
                    editing={editing}
                    canEdit={canLayout}
                    canManage={canManage}
                    canConfigure={canLayout}
                    dirty={dirty}
                    saving={saving}
                    selectedArea={selectedArea}
                    onStartEdit={startEdit}
                    onSave={saveLayout}
                    onCancel={cancelEdit}
                    onNewArea={() => setAreaModal({ open: true, area: null })}
                    onNewRoom={() => setCreateRoomOpen(true)}
                    onEditArea={() =>
                        setAreaModal({ open: true, area: selectedArea })
                    }
                    onColors={() => setColorsOpen(true)}
                />

                {layoutError && (
                    <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                        <Info className="mt-0.5 size-4 shrink-0" />
                        {layoutError}
                    </div>
                )}

                <div className="flex flex-1 flex-col gap-4 lg:flex-row">
                    <HotelMap
                        areas={areasData}
                        rooms={visibleRooms}
                        colors={roomStatusColors}
                        selectedRoomId={selectedRoomId}
                        selectedAreaId={selectedAreaId}
                        editing={editing}
                        showGrid={showGrid}
                        onSelectRoom={selectRoom}
                        onSelectArea={(area) => setSelectedAreaId(area.id)}
                        onMoveRoom={(id, position) => updateRoom(id, position)}
                        onResizeRoom={(id, size) => updateRoom(id, size)}
                        onMoveArea={(id, position) => updateArea(id, position)}
                        onResizeArea={(id, size) => updateArea(id, size)}
                        emptyAction={
                            canLayout ? (
                                <Button
                                    onClick={() =>
                                        setAreaModal({
                                            open: true,
                                            area: null,
                                        })
                                    }
                                >
                                    <Plus className="size-4" />
                                    Crear área
                                </Button>
                            ) : undefined
                        }
                    />

                    <RoomDetailsPanel
                        open={panelOpen && selectedRoom !== null}
                        room={details}
                        selected={selectedRoom}
                        loading={loadingDetails}
                        colors={roomStatusColors}
                        options={options}
                        onClose={closePanel}
                        onRefresh={() => {
                            setLoadingDetails(true);
                            setRefreshKey((value) => value + 1);
                        }}
                    />
                </div>

                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BedDouble className="size-3.5" />
                    La posición que ves proviene de la base de datos del hotel
                    actual.
                </p>
            </div>

            <CreateRoomModal
                isOpen={createRoomOpen}
                areas={areasData}
                onClose={() => setCreateRoomOpen(false)}
            />

            <AreaFormModal
                open={areaModal.open}
                area={areaModal.area}
                buildings={buildings}
                onClose={() => setAreaModal({ open: false, area: null })}
                onSaved={() => setSelectedAreaId(null)}
            />

            <RoomColorsModal
                open={colorsOpen}
                colors={roomStatusColors}
                onClose={() => setColorsOpen(false)}
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
