export const employeeDepartmentLabels: Record<string, string> = {
    administracion: 'Administración',
    recepcion: 'Recepción',
    housekeeping: 'Housekeeping',
    alimentos_bebidas: 'Alimentos y bebidas',
    mantenimiento: 'Mantenimiento',
    seguridad: 'Seguridad',
    rrhh: 'Recursos Humanos',
    otro: 'Otro',
};

export const employeeStatusLabels: Record<string, string> = {
    activo: 'Activo',
    licencia: 'En licencia',
    inactivo: 'Inactivo',
};

export const employeeRoleLabels: Record<string, string> = {
    owner: 'Propietario',
    admin: 'Administrador',
    recepcion: 'Recepción',
    finanzas: 'Finanzas',
    inventario: 'Inventario',
    servicios: 'Servicios',
    rrhh: 'Recursos Humanos',
};

export function employeeLabel(
    map: Record<string, string>,
    value: string | null | undefined,
): string {
    if (!value) {
        return '—';
    }

    return map[value] ?? value;
}
