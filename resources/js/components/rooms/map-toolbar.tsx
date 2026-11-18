import { Grid3x3, Palette, Pencil, Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { roomStatusLabel } from '@/lib/room-status';
import { cn } from '@/lib/utils';
import type { AreaData, RoomStatusColors, RoomStatusKey } from '@/types';

/**
 * Filters, legend and layout actions that sit above the map.
 */
export function MapToolbar({
    search,
    onSearchChange,
    status,
    onStatusChange,
    counts,
    colors,
    areas,
    areaFilter,
    onAreaFilterChange,
    showGrid,
    onToggleGrid,
    editing,
    canEdit,
    canManage,
    canConfigure,
    dirty,
    saving,
    selectedArea,
    onStartEdit,
    onSave,
    onCancel,
    onNewArea,
    onNewRoom,
    onEditArea,
    onColors,
}: {
    search: string;
    onSearchChange: (value: string) => void;
    status: string;
    onStatusChange: (value: string) => void;
    counts: Record<string, number>;
    colors: RoomStatusColors;
    areas: AreaData[];
    areaFilter: string;
    onAreaFilterChange: (value: string) => void;
    showGrid: boolean;
    onToggleGrid: () => void;
    editing: boolean;
    canEdit: boolean;
    canManage: boolean;
    canConfigure: boolean;
    dirty: boolean;
    saving: boolean;
    selectedArea: AreaData | null;
    onStartEdit: () => void;
    onSave: () => void;
    onCancel: () => void;
    onNewArea: () => void;
    onNewRoom: () => void;
    onEditArea: () => void;
    onColors: () => void;
}) {
    return (
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[190px] flex-1">
                    <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => onSearchChange(event.target.value)}
                        placeholder="Buscar habitación..."
                        className="h-9 w-full rounded-lg border border-input bg-background pr-3 pl-9 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    />
                </div>

                <Select value={areaFilter} onValueChange={onAreaFilterChange}>
                    <SelectTrigger className="h-9 w-full sm:w-[190px]">
                        <SelectValue placeholder="Todas las áreas" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas las áreas</SelectItem>
                        {areas.map((area) => (
                            <SelectItem key={area.id} value={String(area.id)}>
                                {area.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button
                    type="button"
                    variant={showGrid ? 'secondary' : 'outline'}
                    size="sm"
                    className="h-9"
                    onClick={onToggleGrid}
                    aria-pressed={showGrid}
                >
                    <Grid3x3 className="size-4" />
                    Cuadrícula
                </Button>

                {canConfigure && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9"
                        onClick={onColors}
                    >
                        <Palette className="size-4" />
                        Colores
                    </Button>
                )}

                {canEdit && !editing && (
                    <Button
                        type="button"
                        size="sm"
                        className="h-9"
                        onClick={onStartEdit}
                    >
                        <Pencil className="size-4" />
                        Editar plano
                    </Button>
                )}

                {editing && (
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9"
                            onClick={onNewArea}
                        >
                            <Plus className="size-4" />
                            Área
                        </Button>
                        {canManage && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9"
                                onClick={onNewRoom}
                                disabled={areas.length === 0}
                            >
                                <Plus className="size-4" />
                                Habitación
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9"
                            onClick={onEditArea}
                            disabled={selectedArea === null}
                        >
                            Editar área
                        </Button>
                        <div className="ml-auto flex items-center gap-2">
                            <span
                                className={cn(
                                    'text-xs',
                                    dirty
                                        ? 'text-amber-600'
                                        : 'text-muted-foreground',
                                )}
                            >
                                {dirty ? 'Cambios sin guardar' : 'Sin cambios'}
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9"
                                onClick={onCancel}
                                disabled={saving}
                            >
                                <X className="size-4" />
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                className="h-9"
                                onClick={onSave}
                                disabled={!dirty || saving}
                            >
                                {saving ? 'Guardando...' : 'Guardar'}
                            </Button>
                        </div>
                    </>
                )}
            </div>

            <div className="-mx-1 flex flex-wrap items-center gap-1.5 px-1">
                <button
                    type="button"
                    onClick={() => onStatusChange('')}
                    className={cn(
                        'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                        status === ''
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-transparent bg-muted text-muted-foreground hover:text-foreground',
                    )}
                >
                    Todas
                </button>
                {(Object.keys(colors) as RoomStatusKey[]).map((key) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() =>
                            onStatusChange(status === key ? '' : key)
                        }
                        className={cn(
                            'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                            status === key
                                ? 'border-foreground/20 bg-background shadow-sm'
                                : 'border-transparent hover:bg-background/70',
                        )}
                        style={
                            status === key
                                ? { borderColor: colors[key] }
                                : undefined
                        }
                        aria-pressed={status === key}
                    >
                        <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: colors[key] }}
                            aria-hidden="true"
                        />
                        {roomStatusLabel(key)}
                        <span className="text-muted-foreground tabular-nums">
                            {counts[key] ?? 0}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
