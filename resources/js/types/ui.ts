import type { ReactNode } from 'react';
import type { BreadcrumbItem } from '@/types/navigation';

export type AppLayoutProps = {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
};

export type AppVariant = 'header' | 'sidebar';

export type FlashToast = {
    type: 'success' | 'info' | 'warning' | 'error';
    message: string;
};

export type AuthLayoutProps = {
    children?: ReactNode;
    name?: string;
    title?: string;
    description?: string;
};

/**
 * Shape of a single link produced by Laravel's LengthAwarePaginator.
 */
export type PaginatorLink = {
    url: string | null;
    label: string;
    active: boolean;
};

/**
 * Flat paginator payload serialized by Laravel when a paginator is passed
 * directly as an Inertia prop.
 */
export type PaginatorMeta = {
    current_page: number;
    data?: unknown[];
    first_page_url?: string;
    from: number | null;
    last_page: number;
    last_page_url?: string;
    links?: PaginatorLink[];
    next_page_url?: string | null;
    path?: string;
    per_page: number;
    prev_page_url?: string | null;
    to: number | null;
    total: number;
};

/**
 * Laravel paginator payload with a typed data array.
 */
export type Paginated<T> = Omit<PaginatorMeta, 'data'> & {
    data: T[];
};

/**
 * Query-string filters shared by the list indexes.
 */
export type ListFiltersState = {
    search?: string | null;
    status?: string | null;
    state?: string | null;
    type?: string | null;
};
