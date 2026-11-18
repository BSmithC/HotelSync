<?php

namespace App\Support;

/**
 * Abilities enforced by Laravel gates and shared with the frontend.
 *
 * The role matrix lives in code (not in the database) so permissions are
 * versioned with the application and cannot drift per installation.
 */
enum Permission: string
{
    case ReceptionView = 'reception.view';
    case ReceptionOperate = 'reception.operate';
    case ReceptionIncidents = 'reception.incidents';

    case FinanceView = 'finance.view';
    case FinanceManage = 'finance.manage';
    case FinanceVoid = 'finance.void';

    case InventoryView = 'inventory.view';
    case InventoryManage = 'inventory.manage';
    case InventoryAdjust = 'inventory.adjust';

    case ServicesView = 'services.view';
    case ServicesManage = 'services.manage';
    case ServicesBill = 'services.bill';

    case EmployeesView = 'employees.view';
    case EmployeesManage = 'employees.manage';
    case EmployeesSensitive = 'employees.sensitive';
    case EmployeesAccess = 'employees.access';

    case ReportsView = 'reports.view';
    case ReportsExport = 'reports.export';

    /**
     * Roles allowed to perform this ability.
     *
     * @return list<Role>
     */
    public function roles(): array
    {
        return match ($this) {
            self::ReceptionView,
            self::ReceptionOperate,
            self::ReceptionIncidents => [
                Role::Owner,
                Role::Admin,
                Role::Reception,
            ],

            self::FinanceView,
            self::FinanceManage,
            self::FinanceVoid => [
                Role::Owner,
                Role::Admin,
                Role::Finance,
            ],

            self::InventoryView,
            self::InventoryManage,
            self::InventoryAdjust => [
                Role::Owner,
                Role::Admin,
                Role::Inventory,
            ],

            self::ServicesView,
            self::ServicesManage => [
                Role::Owner,
                Role::Admin,
                Role::Reception,
                Role::Services,
            ],

            self::ServicesBill => [
                Role::Owner,
                Role::Admin,
                Role::Reception,
                Role::Finance,
                Role::Services,
            ],

            self::EmployeesView,
            self::EmployeesManage,
            self::EmployeesSensitive,
            self::EmployeesAccess => [
                Role::Owner,
                Role::Admin,
                Role::HumanResources,
            ],

            self::ReportsView => [
                Role::Owner,
                Role::Admin,
                Role::Reception,
                Role::Finance,
                Role::Inventory,
                Role::Services,
                Role::HumanResources,
            ],

            self::ReportsExport => [
                Role::Owner,
                Role::Admin,
                Role::Finance,
            ],
        };
    }

    /**
     * Spanish label used by navigation and settings screens.
     */
    public function label(): string
    {
        return match ($this) {
            self::ReceptionView => 'Ver recepción',
            self::ReceptionOperate => 'Operar recepción',
            self::ReceptionIncidents => 'Gestionar incidencias',
            self::FinanceView => 'Ver finanzas',
            self::FinanceManage => 'Gestionar finanzas',
            self::FinanceVoid => 'Anular operaciones financieras',
            self::InventoryView => 'Ver inventario',
            self::InventoryManage => 'Gestionar inventario',
            self::InventoryAdjust => 'Ajustar existencias',
            self::ServicesView => 'Ver servicios',
            self::ServicesManage => 'Gestionar servicios',
            self::ServicesBill => 'Facturar servicios',
            self::EmployeesView => 'Ver empleados',
            self::EmployeesManage => 'Gestionar empleados',
            self::EmployeesSensitive => 'Ver datos sensibles',
            self::EmployeesAccess => 'Asignar accesos',
            self::ReportsView => 'Ver reportes',
            self::ReportsExport => 'Exportar reportes',
        };
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $permission) => $permission->value, self::cases());
    }
}
