export const paymentMethodLabels: Record<string, string> = {
    efectivo: 'Efectivo',
    tarjeta: 'Tarjeta',
    transferencia: 'Transferencia',
    cheque: 'Cheque',
    otro: 'Otro',
};

export const expenseCategoryLabels: Record<string, string> = {
    operativo: 'Operativo',
    mantenimiento: 'Mantenimiento',
    suministros: 'Suministros',
    personal: 'Personal',
    servicios_basicos: 'Servicios básicos',
    marketing: 'Marketing',
    impuestos: 'Impuestos',
    otro: 'Otro',
};

export const financeStatusLabels: Record<string, string> = {
    registrado: 'Registrado',
    anulado: 'Anulado',
    ingreso: 'Ingreso',
    egreso: 'Egreso',
};

export const movementDirectionLabels: Record<string, string> = {
    ingreso: 'Ingreso',
    egreso: 'Egreso',
};

export function labelFor(
    map: Record<string, string>,
    value: string | null | undefined,
): string {
    if (!value) {
        return '—';
    }

    return map[value] ?? value;
}
