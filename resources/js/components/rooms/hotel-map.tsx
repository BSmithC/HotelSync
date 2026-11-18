import { Maximize, Minus, Plus } from 'lucide-react';
import {
    useCallback,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
} from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { AreaData, RoomData, RoomStatusColors } from '@/types';
import { AreaShape } from './area-shape';
import { RoomShape } from './room-shape';

type Viewport = {
    scale: number;
    x: number;
    y: number;
};

const MIN_SCALE = 0.3;
const MAX_SCALE = 2.5;
const GRID_SIZE = 40;

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

/**
 * Interactive hotel map.
 *
 * The world is a plain CSS-transformed container: zoom and pan only change the
 * viewport, never the stored coordinates.
 */
export function HotelMap({
    areas,
    rooms,
    colors,
    selectedRoomId,
    selectedAreaId,
    editing,
    showGrid,
    onSelectRoom,
    onSelectArea,
    onMoveRoom,
    onResizeRoom,
    onMoveArea,
    onResizeArea,
    emptyAction,
}: {
    areas: AreaData[];
    rooms: RoomData[];
    colors: RoomStatusColors;
    selectedRoomId: number | null;
    selectedAreaId: number | null;
    editing: boolean;
    showGrid: boolean;
    onSelectRoom: (room: RoomData) => void;
    onSelectArea: (area: AreaData) => void;
    onMoveRoom: (
        id: number,
        position: { pos_x: number; pos_y: number },
    ) => void;
    onResizeRoom: (id: number, size: { width: number; height: number }) => void;
    onMoveArea: (id: number, position: { x: number; y: number }) => void;
    onResizeArea: (id: number, size: { width: number; height: number }) => void;
    emptyAction?: ReactNode;
}) {
    const gridId = useId();
    const containerRef = useRef<HTMLDivElement>(null);
    const [viewport, setViewport] = useState<Viewport>({
        scale: 1,
        x: 0,
        y: 0,
    });
    const [size, setSize] = useState({ width: 0, height: 0 });

    const [dragging, setDragging] = useState(false);

    const viewportRef = useRef(viewport);

    useEffect(() => {
        viewportRef.current = viewport;
    }, [viewport]);

    const pointers = useRef(new Map<number, { x: number; y: number }>());
    const panRef = useRef<{
        x: number;
        y: number;
        offsetX: number;
        offsetY: number;
        scale: number;
    } | null>(null);
    const pinchRef = useRef<{ distance: number; scale: number } | null>(null);

    const { worldWidth, worldHeight } = useMemo(() => {
        const maxX = areas.reduce(
            (max, area) => Math.max(max, area.x + area.width),
            0,
        );
        const maxY = areas.reduce(
            (max, area) => Math.max(max, area.y + area.height),
            0,
        );

        return {
            worldWidth: Math.max(900, maxX + 120),
            worldHeight: Math.max(600, maxY + 120),
        };
    }, [areas]);

    const zoomToAt = useCallback((px: number, py: number, target: number) => {
        setViewport((previous) => {
            const scale = clamp(target, MIN_SCALE, MAX_SCALE);
            const ratio = scale / previous.scale;

            return {
                scale,
                x: px - (px - previous.x) * ratio,
                y: py - (py - previous.y) * ratio,
            };
        });
    }, []);

    const zoomByAt = useCallback(
        (px: number, py: number, factor: number) => {
            zoomToAt(px, py, viewportRef.current.scale * factor);
        },
        [zoomToAt],
    );

    useEffect(() => {
        const element = containerRef.current;

        if (element === null) {
            return;
        }

        const handleWheel = (event: WheelEvent) => {
            event.preventDefault();

            const rect = element.getBoundingClientRect();
            const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;

            zoomByAt(
                event.clientX - rect.left,
                event.clientY - rect.top,
                factor,
            );
        };

        element.addEventListener('wheel', handleWheel, { passive: false });

        return () => element.removeEventListener('wheel', handleWheel);
    }, [zoomByAt]);

    useEffect(() => {
        const element = containerRef.current;

        if (element === null) {
            return;
        }

        const observer = new ResizeObserver((entries) => {
            const rect = entries[0]?.contentRect;

            if (rect) {
                setSize({ width: rect.width, height: rect.height });
            }
        });

        observer.observe(element);

        return () => observer.disconnect();
    }, []);

    const fitToScreen = useCallback(() => {
        if (size.width === 0 || size.height === 0) {
            return;
        }

        const scale = clamp(
            Math.min(
                (size.width - 24) / worldWidth,
                (size.height - 24) / worldHeight,
            ),
            MIN_SCALE,
            1.2,
        );

        setViewport({
            scale,
            x: (size.width - worldWidth * scale) / 2,
            y: (size.height - worldHeight * scale) / 2,
        });
    }, [size, worldHeight, worldWidth]);

    const fitted = useRef(false);

    useEffect(() => {
        if (!fitted.current && size.width > 0) {
            fitted.current = true;
            fitToScreen();
        }
    }, [fitToScreen, size.width]);

    const startPan = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) {
            return;
        }

        event.preventDefault();
        pointers.current.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
        });
        setDragging(true);
        containerRef.current?.setPointerCapture(event.pointerId);

        if (pointers.current.size === 1) {
            panRef.current = {
                x: event.clientX,
                y: event.clientY,
                offsetX: viewportRef.current.x,
                offsetY: viewportRef.current.y,
                scale: viewportRef.current.scale,
            };
            pinchRef.current = null;

            return;
        }

        if (pointers.current.size === 2) {
            panRef.current = null;
            const [first, second] = [...pointers.current.values()];

            pinchRef.current = {
                distance: Math.hypot(first.x - second.x, first.y - second.y),
                scale: viewportRef.current.scale,
            };
        }
    };

    const movePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!pointers.current.has(event.pointerId)) {
            return;
        }

        pointers.current.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
        });

        const pinch = pinchRef.current;

        if (pinch !== null && pointers.current.size >= 2) {
            const [first, second] = [...pointers.current.values()];
            const distance = Math.hypot(first.x - second.x, first.y - second.y);
            const rect = containerRef.current?.getBoundingClientRect();

            if (rect && pinch.distance > 0) {
                zoomToAt(
                    (first.x + second.x) / 2 - rect.left,
                    (first.y + second.y) / 2 - rect.top,
                    pinch.scale * (distance / pinch.distance),
                );
            }

            return;
        }

        const pan = panRef.current;

        if (pan === null) {
            return;
        }

        setViewport({
            scale: pan.scale,
            x: pan.offsetX + event.clientX - pan.x,
            y: pan.offsetY + event.clientY - pan.y,
        });
    };

    const endPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
        pointers.current.delete(event.pointerId);
        setDragging(pointers.current.size > 0);

        if (containerRef.current?.hasPointerCapture(event.pointerId)) {
            containerRef.current.releasePointerCapture(event.pointerId);
        }

        if (pointers.current.size < 2) {
            pinchRef.current = null;
        }

        if (pointers.current.size === 1) {
            const [remaining] = [...pointers.current.values()];

            panRef.current = {
                x: remaining.x,
                y: remaining.y,
                offsetX: viewportRef.current.x,
                offsetY: viewportRef.current.y,
                scale: viewportRef.current.scale,
            };

            return;
        }

        panRef.current = null;
    };

    const roomsByArea = useMemo(() => {
        const grouped = new Map<number, RoomData[]>();

        for (const room of rooms) {
            const list = grouped.get(room.area_id) ?? [];
            list.push(room);
            grouped.set(room.area_id, list);
        }

        return grouped;
    }, [rooms]);

    return (
        <div
            ref={containerRef}
            className={cn(
                'relative min-h-[420px] flex-1 touch-none overflow-hidden rounded-xl border bg-muted/20 select-none',
            )}
            onPointerDown={startPan}
            onPointerMove={movePointer}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
            style={{
                cursor: dragging ? 'grabbing' : 'grab',
                backgroundImage:
                    'radial-gradient(circle at 1px 1px, rgba(120, 132, 148, 0.22) 1px, transparent 0)',
                backgroundSize: '24px 24px',
            }}
            aria-label="Plano de habitaciones"
        >
            <div
                className="absolute top-0 left-0 origin-top-left"
                style={{
                    width: worldWidth,
                    height: worldHeight,
                    transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
                }}
            >
                {showGrid && (
                    <svg
                        className="pointer-events-none absolute inset-0 size-full text-foreground/10"
                        width={worldWidth}
                        height={worldHeight}
                        aria-hidden="true"
                    >
                        <defs>
                            <pattern
                                id={gridId}
                                width={GRID_SIZE}
                                height={GRID_SIZE}
                                patternUnits="userSpaceOnUse"
                            >
                                <path
                                    d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`}
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1"
                                />
                            </pattern>
                        </defs>
                        <rect
                            width="100%"
                            height="100%"
                            fill={`url(#${gridId})`}
                        />
                    </svg>
                )}

                {areas.map((area) => (
                    <AreaShape
                        key={area.id}
                        area={area}
                        selected={selectedAreaId === area.id}
                        editing={editing}
                        scale={viewport.scale}
                        onSelect={onSelectArea}
                        onMove={onMoveArea}
                        onResize={onResizeArea}
                    >
                        {(roomsByArea.get(area.id) ?? []).map((room) => (
                            <RoomShape
                                key={room.id}
                                room={room}
                                colors={colors}
                                selected={selectedRoomId === room.id}
                                editing={editing}
                                scale={viewport.scale}
                                bounds={{
                                    width: area.width,
                                    height: area.height,
                                }}
                                onSelect={onSelectRoom}
                                onMove={onMoveRoom}
                                onResize={onResizeRoom}
                            />
                        ))}
                    </AreaShape>
                ))}
            </div>

            {areas.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/60 p-6 text-center">
                    <p className="max-w-sm text-sm text-muted-foreground">
                        Todavía no hay áreas en el plano. Crea la primera para
                        empezar a distribuir las habitaciones.
                    </p>
                    {emptyAction}
                </div>
            )}

            <div className="absolute top-3 right-3 hidden rounded-lg border bg-background/85 px-2.5 py-1.5 text-[11px] text-muted-foreground shadow-sm sm:block">
                Rueda para acercar · Arrastra para mover
            </div>

            <div className="absolute right-3 bottom-3 flex items-center gap-1 rounded-lg border bg-background/90 p-1 shadow-sm">
                <button
                    type="button"
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    aria-label="Alejar"
                    onClick={() => {
                        const center = {
                            x: size.width / 2,
                            y: size.height / 2,
                        };
                        zoomByAt(center.x, center.y, 1 / 1.2);
                    }}
                >
                    <Minus className="size-4" />
                </button>
                <span className="min-w-11 text-center text-xs font-medium tabular-nums">
                    {Math.round(viewport.scale * 100)}%
                </span>
                <button
                    type="button"
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    aria-label="Acercar"
                    onClick={() => {
                        const center = {
                            x: size.width / 2,
                            y: size.height / 2,
                        };
                        zoomByAt(center.x, center.y, 1.2);
                    }}
                >
                    <Plus className="size-4" />
                </button>
                <button
                    type="button"
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    aria-label="Ajustar el plano a la pantalla"
                    onClick={fitToScreen}
                >
                    <Maximize className="size-4" />
                </button>
            </div>
        </div>
    );
}
