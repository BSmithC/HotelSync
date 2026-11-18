import {
    Armchair,
    Building2,
    Layers,
    MapPin,
    MoveRight,
    Shapes,
    Sun,
    Trees,
    Waves,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import {
    AREA_TYPE_LABELS,
    DEFAULT_AREA_COLOR,
    softColor,
} from '@/lib/room-status';
import { cn } from '@/lib/utils';
import type { AreaData } from '@/types';

const AREA_ICONS: Record<string, LucideIcon> = {
    edificio: Building2,
    piso: Layers,
    zona: MapPin,
    pasillo: MoveRight,
    jardin: Trees,
    piscina: Waves,
    terraza: Sun,
    salon: Armchair,
    otro: Shapes,
};

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

const MIN_SIZE = 100;
const SNAP = 10;

function snap(value: number): number {
    return Math.round(value / SNAP) * SNAP;
}

/**
 * A common area (floor, garden, pool, corridor...) that hosts rooms.
 *
 * Moving or resizing the area never touches the rooms: their coordinates stay
 * local, so the whole block moves together.
 */
export function AreaShape({
    area,
    selected,
    editing,
    scale,
    onSelect,
    onMove,
    onResize,
    children,
}: {
    area: AreaData;
    selected: boolean;
    editing: boolean;
    scale: number;
    onSelect: (area: AreaData) => void;
    onMove: (id: number, position: { x: number; y: number }) => void;
    onResize: (id: number, size: { width: number; height: number }) => void;
    children: ReactNode;
}) {
    const elementRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<DragState | null>(null);

    const color = area.color ?? DEFAULT_AREA_COLOR;
    const Icon = AREA_ICONS[area.type] ?? Shapes;

    const start = (
        event: ReactPointerEvent<HTMLElement>,
        mode: DragState['mode'],
    ) => {
        if (!editing || event.button !== 0) {
            return;
        }

        event.stopPropagation();
        elementRef.current?.setPointerCapture(event.pointerId);
        onSelect(area);

        dragRef.current =
            mode === 'move'
                ? {
                      mode: 'move',
                      startX: event.clientX,
                      startY: event.clientY,
                      originX: area.x,
                      originY: area.y,
                  }
                : {
                      mode: 'resize',
                      startX: event.clientX,
                      startY: event.clientY,
                      originWidth: area.width,
                      originHeight: area.height,
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
            onMove(area.id, {
                x: Math.max(0, snap(drag.originX + dx)),
                y: Math.max(0, snap(drag.originY + dy)),
            });

            return;
        }

        onResize(area.id, {
            width: Math.max(MIN_SIZE, snap(drag.originWidth + dx)),
            height: Math.max(MIN_SIZE, snap(drag.originHeight + dy)),
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
            className={cn(
                'absolute rounded-2xl border-2',
                editing && 'cursor-grab active:cursor-grabbing',
                selected && 'ring-2 ring-primary ring-offset-2',
            )}
            style={{
                left: area.x,
                top: area.y,
                width: area.width,
                height: area.height,
                borderColor: softColor(color, 'aa'),
                backgroundColor: softColor(color, '1f'),
            }}
            onPointerDown={(event) => start(event, 'move')}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
        >
            <div className="pointer-events-none flex max-w-full items-center gap-1.5 px-2 pt-1.5">
                <Icon className="size-3.5 shrink-0" style={{ color }} />
                <span className="truncate text-[11px] font-semibold tracking-wide text-foreground/80 uppercase">
                    {area.name}
                </span>
                <span className="shrink-0 rounded bg-background/60 px-1 text-[9px] font-medium text-muted-foreground">
                    {AREA_TYPE_LABELS[area.type] ?? area.type}
                </span>
                {area.floor !== null && (
                    <span className="shrink-0 text-[9px] text-muted-foreground">
                        Piso {area.floor}
                    </span>
                )}
            </div>

            {children}

            {editing && selected && (
                <span
                    role="presentation"
                    aria-hidden="true"
                    title="Redimensionar área"
                    className="absolute right-0 bottom-0 size-3.5 cursor-se-resize rounded-tl-sm bg-primary"
                    onPointerDown={(event) => start(event, 'resize')}
                />
            )}
        </div>
    );
}
