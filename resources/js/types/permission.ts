/**
 * Abilities shared by Laravel (`App\Support\Permission`) and React.
 *
 * Keep both lists in sync: the backend is always the source of truth, this
 * union only provides autocompletion and prevents typos in the UI.
 */
export const permissionValues = [
    'reception.view',
    'reception.operate',
    'reception.incidents',
    'finance.view',
    'finance.manage',
    'finance.void',
    'inventory.view',
    'inventory.manage',
    'inventory.adjust',
    'services.view',
    'services.manage',
    'services.bill',
    'employees.view',
    'employees.manage',
    'employees.sensitive',
    'employees.access',
    'reports.view',
    'reports.export',
] as const;

export type Permission = (typeof permissionValues)[number];

export const roleValues = [
    'owner',
    'admin',
    'recepcion',
    'finanzas',
    'inventario',
    'servicios',
    'rrhh',
] as const;

export type Role = (typeof roleValues)[number];
