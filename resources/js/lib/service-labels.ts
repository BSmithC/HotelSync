export const serviceCategoryLabels: Record<string, string> = {
    restaurante: 'Restaurante',
    bar: 'Bar',
    spa: 'Spa',
    lavanderia: 'Lavandería',
    transporte: 'Transporte',
    tour: 'Tour',
    room_service: 'Room service',
    otro: 'Otro',
};

export const serviceRequestStatusLabels: Record<string, string> = {
    pendiente: 'Pendiente',
    en_proceso: 'En proceso',
    completado: 'Completado',
    facturado: 'Facturado',
    anulado: 'Anulado',
};

export function serviceLabel(
    map: Record<string, string>,
    value: string | null | undefined,
): string {
    if (!value) {
        return '—';
    }

    return map[value] ?? value;
}
