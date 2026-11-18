import type { InertiaLinkProps } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import type { Permission } from './permission';

export type BreadcrumbItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
};

export type NavItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
    /** Modules that are not available yet are rendered but cannot be opened. */
    disabled?: boolean;
    /** Small label shown at the end of the item (for example "Pronto"). */
    badge?: string;
    /**
     * Ability required to see the item. The server still authorizes every
     * request; this only hides navigation the user cannot use.
     */
    permission?: Permission | Permission[];
};
