import { usePage } from '@inertiajs/react';
import type { Permission, Role } from '@/types';

export type UsePermissionsReturn = {
    permissions: Permission[];
    role: Role | null;
    roleLabel: string | null;
    /** True when the user holds the ability in the current hotel. */
    can: (permission: Permission) => boolean;
    /** True when the user holds at least one of the abilities. */
    canAny: (...permissions: Permission[]) => boolean;
    /** True when the user has any of the given roles. */
    hasRole: (...roles: Role[]) => boolean;
};

/**
 * Reads the abilities shared by Laravel.
 *
 * Use it only to hide or disable UI. Every action must still be validated on
 * the server through the equivalent gate.
 */
export function usePermissions(): UsePermissionsReturn {
    const { auth } = usePage().props;
    const permissions = auth.permissions ?? [];
    const role = auth.role ?? null;

    const can = (permission: Permission): boolean =>
        permissions.includes(permission);

    return {
        permissions,
        role,
        roleLabel: auth.roleLabel ?? null,
        can,
        canAny: (...list: Permission[]): boolean => list.some(can),
        hasRole: (...roles: Role[]): boolean =>
            role !== null && roles.includes(role),
    };
}
