export const inventoryCategoryLabels: Record<string, string> = {
    limpieza: 'Limpieza',
    lenceria: 'Lencería',
    alimentos: 'Alimentos',
    bebidas: 'Bebidas',
    mantenimiento: 'Mantenimiento',
    amenidades: 'Amenidades',
    papeleria: 'Papelería',
    otro: 'Otro',
};

export const inventoryUnitLabels: Record<string, string> = {
    unidad: 'Unidad',
    caja: 'Caja',
    paquete: 'Paquete',
    botella: 'Botella',
    litro: 'Litro',
    kilogramo: 'Kilogramo',
    metro: 'Metro',
    rollo: 'Rollo',
};

export const inventoryMovementTypeLabels: Record<string, string> = {
    entrada: 'Entrada',
    salida: 'Salida',
    ajuste: 'Ajuste',
};

export const inventoryMovementStateLabels: Record<string, string> = {
    vigente: 'Vigente',
    anulado: 'Anulado',
    reverso: 'Reverso',
};

export function inventoryLabel(
    map: Record<string, string>,
    value: string | null | undefined,
): string {
    if (!value) {
        return '—';
    }

    return map[value] ?? value;
}
