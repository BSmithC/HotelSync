import { BedDouble, Building2, X } from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { roomStatusColor, roomStatusLabel, softColor } from '@/lib/room-status';
import { cn } from '@/lib/utils';
import type {
    RoomData,
    RoomDetails,
    RoomPanelOptions,
    RoomStatusColors,
} from '@/types';
import { RoomActions } from './room-actions';
import { RoomDetailsContent } from './room-details-content';

function PanelSkeleton() {
    return (
        <div className="space-y-4 px-4 py-4">
            <Skeleton className="h-4 w-1/3" />
            <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className="h-10 w-full" />
                ))}
            </div>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
        </div>
    );
}

function PanelBody({
    room,
    loading,
    selected,
    colors,
    options,
    onClose,
    onRefresh,
}: {
    room: RoomDetails | null;
    loading: boolean;
    selected: RoomData | null;
    colors: RoomStatusColors;
    options: RoomPanelOptions;
    onClose: () => void;
    onRefresh: () => void;
}) {
    const summary = room ?? selected;
    const status = summary?.status ?? '';
    const color = roomStatusColor(status, colors);
    const areaName = summary?.area?.name ?? null;

    return (
        <>
            <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
                <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                        <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: color }}
                            aria-hidden="true"
                        />
                        <h2 className="truncate text-base font-semibold">
                            {summary?.name ?? 'Habitación'}
                        </h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        {areaName && (
                            <span className="inline-flex items-center gap-1">
                                <Building2 className="size-3" />
                                {areaName}
                            </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                            <BedDouble className="size-3" />
                            {summary?.capacity ?? 0}{' '}
                            {summary?.capacity === 1 ? 'huésped' : 'huéspedes'}
                        </span>
                        {status && (
                            <span
                                className="rounded-full px-1.5 py-0.5 font-medium"
                                style={{
                                    backgroundColor: softColor(color, '1f'),
                                    color,
                                }}
                            >
                                {roomStatusLabel(status)}
                            </span>
                        )}
                        {summary && !summary.active && (
                            <span className="rounded-full bg-muted px-1.5 py-0.5 font-medium">
                                Inactiva
                            </span>
                        )}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    aria-label="Cerrar detalles de la habitación"
                >
                    <X className="size-4" />
                </button>
            </div>

            {room !== null && (
                <RoomActions
                    room={room}
                    options={options}
                    onRefresh={onRefresh}
                />
            )}

            <div className="relative min-h-0 flex-1 overflow-hidden">
                {room === null ? (
                    <PanelSkeleton />
                ) : (
                    <RoomDetailsContent
                        room={room}
                        colors={colors}
                        className="h-full"
                    />
                )}
                {loading && room !== null && (
                    <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-primary/20">
                        <div className="h-full w-1/3 animate-pulse bg-primary" />
                    </div>
                )}
            </div>
        </>
    );
}

/**
 * Right-hand details drawer.
 *
 * On desktop it is a real column, so the map keeps its width and stays
 * visible. On small screens it becomes a full-height sheet.
 */
export function RoomDetailsPanel({
    open,
    room,
    selected,
    loading,
    colors,
    options,
    onClose,
    onRefresh,
}: {
    open: boolean;
    room: RoomDetails | null;
    selected: RoomData | null;
    loading: boolean;
    colors: RoomStatusColors;
    options: RoomPanelOptions;
    onClose: () => void;
    onRefresh: () => void;
}) {
    const isMobile = useIsMobile();

    if (isMobile) {
        return (
            <Sheet
                open={open}
                onOpenChange={(value) => {
                    if (!value) {
                        onClose();
                    }
                }}
            >
                <SheetContent
                    side="right"
                    className="w-full gap-0 p-0 sm:max-w-md"
                >
                    <SheetHeader className="sr-only">
                        <SheetTitle>Detalle de la habitación</SheetTitle>
                        <SheetDescription>
                            Información y acciones de la habitación
                            seleccionada.
                        </SheetDescription>
                    </SheetHeader>
                    <div className="flex min-h-0 flex-1 flex-col">
                        <PanelBody
                            room={room}
                            selected={selected}
                            loading={loading}
                            colors={colors}
                            options={options}
                            onClose={onClose}
                            onRefresh={onRefresh}
                        />
                    </div>
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <aside
            className={cn(
                'flex min-h-[520px] w-[340px] shrink-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm xl:w-[380px]',
                !open && 'hidden',
            )}
            aria-label="Detalle de la habitación"
        >
            {open && (
                <PanelBody
                    room={room}
                    selected={selected}
                    loading={loading}
                    colors={colors}
                    options={options}
                    onClose={onClose}
                    onRefresh={onRefresh}
                />
            )}
        </aside>
    );
}
