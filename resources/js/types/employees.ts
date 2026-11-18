import type { Paginated } from './ui';

export type EmployeeStatus = 'activo' | 'licencia' | 'inactivo';

export type EmployeeUser = {
    id: number;
    name: string;
    email: string;
};

export type Employee = {
    id: number;
    hotel_id: number;
    user_id: number | null;
    first_name: string;
    last_name: string;
    position: string;
    department: string;
    hire_date: string;
    status: EmployeeStatus | string;
    created_at: string;
    updated_at: string;
    user?: EmployeeUser | null;

    // Sensitive fields: only present when the actor can view them.
    cedula?: string | null;
    birth_date?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    salary?: string | number | null;
    bank_account?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    notes?: string | null;
};

export type EmployeeRecentHire = {
    id: number;
    user_id: number | null;
    first_name: string;
    last_name: string;
    position: string;
    department: string;
    hire_date: string;
    status: string;
    user?: EmployeeUser | null;
};

export type EmployeeDepartmentSummary = {
    department: string;
    total: number;
};

export type EmployeeBirthday = {
    id: number;
    name: string;
    department: string;
    day: number;
};

export type EmployeeAccessUser = {
    id: number;
    name: string;
    email: string;
    role: string | null;
    roleLabel: string | null;
    linked_employee_id: number | null;
};

export type EmployeeKpis = {
    active: number;
    onLeave: number;
    inactive: number;
    departments: number;
    accessLinked: number;
    hiresThisMonth: number;
    payroll: number | null;
};

export type EmployeeTab = 'resumen' | 'directorio';

export type EmployeeFilters = {
    search: string;
    department: string;
    status: string;
    access: string;
    hired_from: string;
    hired_to: string;
    tab: EmployeeTab;
};

export type EmployeeRoleOption = {
    value: string;
    label: string;
};

export type EmployeeOptions = {
    departments: string[];
    statuses: string[];
    roles: EmployeeRoleOption[];
};

export type EmployeePermissions = {
    manage: boolean;
    sensitive: boolean;
    access: boolean;
};

export type EmployeesIndexProps = {
    currency: string;
    timezone: string;
    kpis: EmployeeKpis;
    employees: Paginated<Employee>;
    recentHires: EmployeeRecentHire[];
    departmentSummary: EmployeeDepartmentSummary[];
    upcomingBirthdays: EmployeeBirthday[];
    availableUsers: EmployeeAccessUser[];
    filters: EmployeeFilters;
    options: EmployeeOptions;
    permissions: EmployeePermissions;
};
