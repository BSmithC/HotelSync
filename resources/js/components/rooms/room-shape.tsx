import { BedDouble } from 'lucide-react';
import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { roomStatusColor, roomStatusLabel, softColor } from '@/lib/room-status';
import { cn } from '@/lib/utils';
import type { RoomData, RoomStatusColors } from '@/types';

type DragState =
    | {
          mode: 'move';
          startX: number;
          startY: number;
          originX: number;
          originY: number;
      }
    | {
          mode: 'resize';
          startX: number;
          startY: number;
          originWidth: number;
          originHeight: number;
      };

const MIN_SIZE = 40;
const SNAP = 10;

function snap(value: number): number {
    return Math.round(value / SNAP) * SNAP;
}

/**
 * A room drawn on the map.
 *
 * Rooms are positioned locally inside their area; during edition the same
 * element drags and resizes itself with Pointer Events, so no canvas library
 * is required.
 */
export function RoomShape({
    room,
    colors,
    selected,
    editing,
    scale,
    bounds,
    onSelect,
    onMove,
    onResize,
}: {
    room: RoomData;
    colors: RoomStatusColors;
    selected: boolean;
    editing: boolean;
    scale: number;
    bounds: { width: number; height: number };
    onSelect: (room: RoomData) => void;
    onMove: (id: number, position: { pos_x: number; pos_y: number }) => void;
    onResize: (id: number, size: { width: number; height: number }) => void;
}) {
    const elementRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<DragState | null>(null);

    const color = roomStatusColor(room.status, colors);
    const compact = room.width < 120 || room.height < 72;

    const start = (
        event: ReactPointerEvent<HTMLElement>,
        mode: DragState['mode'],
    ) => {
        if (!editing || event.button !== 0) {
            return;
        }

        event.stopPropagation();
        elementRef.current?.setPointerCapture(event.pointerId);
        onSelect(room);

        dragRef.current =
            mode === 'move'
                ? {
                      mode: 'move',
                      startX: event.clientX,
                      startY: event.clientY,
                      originX: room.pos_x,
                      originY: room.pos_y,
                  }
                : {
                      mode: 'resize',
                      startX: event.clientX,
                      startY: event.clientY,
                      originWidth: room.width,
                      originHeight: room.height,
                  };
    };

    const move = (event: ReactPointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;

        if (drag === null) {
            return;
        }

        event.stopPropagation();

        const dx = (event.clientX - drag.startX) / scale;
        const dy = (event.clientY - drag.startY) / scale;

        if (drag.mode === 'move') {
            const maxX = Math.max(0, bounds.width - room.width);
            const maxY = Math.max(0, bounds.height - room.height);

            onMove(room.id, {
                pos_x: Math.min(maxX, Math.max(0, snap(drag.originX + dx))),
                pos_y: Math.min(maxY, Math.max(0, snap(drag.originY + dy))),
            });

            return;
        }

        const maxWidth = Math.max(MIN_SIZE, bounds.width - room.pos_x);
        const maxHeight = Math.max(MIN_SIZE, bounds.height - room.pos_y);

        onResize(room.id, {
            width: Math.min(
                maxWidth,
                Math.max(MIN_SIZE, snap(drag.originWidth + dx)),
            ),
            height: Math.min(
                maxHeight,
                Math.max(MIN_SIZE, snap(drag.originHeight + dy)),
            ),
        });
    };

    const end = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (dragRef.current === null) {
            return;
        }

        dragRef.current = null;

        if (elementRef.current?.hasPointerCapture(event.pointerId)) {
            elementRef.current.releasePointerCapture(event.pointerId);
        }
    };

    return (
        <div
            ref={elementRef}
            role="button"
            tabIndex={0}
            aria-label={`${room.name}, ${roomStatusLabel(room.status)}${room.active ? '' : ', inactiva'}`}
            aria-pressed={selected}
            className={cn(
                'absolute flex touch-none flex-col justify-between overflow-hidden rounded-lg border-2 p-1.5 text-left shadow-sm transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                editing && 'cursor-grab active:cursor-grabbing',
                !editing && 'cursor-pointer hover:shadow-md',
                selected && 'z-30 ring-2 ring-primary ring-offset-2',
                !selected && 'z-20',
                !room.active && 'opacity-50 grayscale',
                room.shape === 'circle' && 'rounded-full text-center',
            )}
            style={{
                left: room.pos_x,
                top: room.pos_y,
                width: room.width,
                height: room.height,
                borderColor: color,
                backgroundColor: softColor(color, '18'),
                transform: room.rotation
                    ? `rotate(${room.rotation}deg)`
                    : undefined,
            }}
            onPointerDown={(event) => {
                if (!editing) {
                    event.stopPropagation();
                    onSelect(room);

                    return;
                }

                start(event, 'move');
            }}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(room);
                }
            }}
        >
            <div className="flex min-w-0 items-center gap-1.5">
                <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                />
                <BedDouble className="size-3.5 shrink-0 text-foreground/70" />
                <span
                    className={cn(
                        'truncate text-[11px] font-semibold text-foreground',
                        compact && 'sr-only',
                    )}
                >
                    {room.name}
                </span>
            </div>

            {!compact && (
                <div className="flex min-w-0 items-center justify-between gap-1 text-[10px] text-muted-foreground">
                    <span className="truncate">
                        {room.category ?? `${room.capacity} huéspedes`}
                    </span>
                    <span className="shrink-0 font-medium" style={{ color }}>
                        {roomStatusLabel(room.status)}
                    </span>
                </div>
            )}

            {editing && selected && (
                <span
                    role="presentation"
                    aria-hidden="true"
                    title="Redimensionar"
                    className="absolute right-0 bottom-0 size-3 cursor-se-resize rounded-tl-sm bg-primary"
                    onPointerDown={(event) => {
                        start(event, 'resize');
                    }}
                />
            )}
        </div>
    );
}
