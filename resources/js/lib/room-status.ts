import type { RoomStatusColors, RoomStatusKey } from '@/types';

/**
 * Operational room states, labels and fallback palette.
 *
 * The real palette is shared by Laravel through `roomStatusColors`, so the
 * map, the drawer and Reception always agree with the backend.
 */
export const ROOM_STATUS_KEYS: RoomStatusKey[] = [
    'disponible',
    'ocupada',
    'reservada',
    'limpieza',
    'mantenimiento',
];

export const DEFAULT_ROOM_STATUS_COLORS: RoomStatusColors = {
    disponible: '#12b76a',
    ocupada: '#f04438',
    reservada: '#465fff',
    limpieza: '#f79009',
    mantenimiento: '#667085',
};

export const ROOM_STATUS_LABELS: Record<RoomStatusKey, string> = {
    disponible: 'Disponible',
    ocupada: 'Ocupada',
    reservada: 'Reservada',
    limpieza: 'Limpieza',
    mantenimiento: 'Mantenimiento',
};

const ROOM_STATUS_BADGES: Record<RoomStatusKey, string> = {
    disponible:
        'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    ocupada: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
    reservada:
        'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300',
    limpieza:
        'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    mantenimiento:
        'bg-slate-200 text-slate-800 dark:bg-slate-500/15 dark:text-slate-300',
};

function isStatus(status: string): status is RoomStatusKey {
    return (ROOM_STATUS_KEYS as string[]).includes(status);
}

export function roomStatusLabel(status: string): string {
    return isStatus(status) ? ROOM_STATUS_LABELS[status] : status;
}

export function roomStatusColor(
    status: string,
    colors?: Partial<RoomStatusColors> | null,
): string {
    const fallback = isStatus(status)
        ? DEFAULT_ROOM_STATUS_COLORS[status]
        : DEFAULT_ROOM_STATUS_COLORS.mantenimiento;

    if (isStatus(status) && colors?.[status]) {
        return colors[status];
    }

    return fallback;
}

export function roomStatusBadgeClass(status: string): string {
    return isStatus(status)
        ? ROOM_STATUS_BADGES[status]
        : 'bg-muted text-muted-foreground';
}

/**
 * Adds a soft alpha channel to a `#rrggbb` colour for map surfaces.
 */
export function softColor(color: string, alpha = '22'): string {
    return /^#[0-9a-fA-F]{6}$/.test(color) ? `${color}${alpha}` : color;
}

export const AREA_TYPE_LABELS: Record<string, string> = {
    edificio: 'Edificio',
    piso: 'Piso',
    zona: 'Zona',
    pasillo: 'Pasillo',
    jardin: 'Jardín',
    piscina: 'Piscina',
    terraza: 'Terraza',
    salon: 'Salón',
    otro: 'Otro',
};

export const DEFAULT_AREA_COLOR = '#94a3b8';
