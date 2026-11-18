<?php

namespace App\Support;

/**
 * Roles available inside a hotel (stored in the hotel_user pivot).
 */
enum Role: string
{
    case Owner = 'owner';
    case Admin = 'admin';
    case Reception = 'recepcion';
    case Finance = 'finanzas';
    case Inventory = 'inventario';
    case Services = 'servicios';
    case HumanResources = 'rrhh';

    /**
     * Human readable label used by the UI.
     */
    public function label(): string
    {
        return match ($this) {
            self::Owner => 'Propietario',
            self::Admin => 'Administrador',
            self::Reception => 'Recepción',
            self::Finance => 'Finanzas',
            self::Inventory => 'Inventario',
            self::Services => 'Servicios',
            self::HumanResources => 'Recursos Humanos',
        };
    }
}
