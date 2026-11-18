import { usePage } from '@inertiajs/react';
import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import { configureFormatting } from '@/lib/format';
import type { BreadcrumbItem } from '@/types';

export default function AppLayout({
    breadcrumbs = [],
    children,
}: {
    breadcrumbs?: BreadcrumbItem[];
    children: React.ReactNode;
}) {
    const { hotelConfig, currentHotel } = usePage().props;

    // Keep date/number formatting aligned with the hotel preferences. The
    // functions are used all over the app, so a module-level configuration is
    // simpler than threading the locale through every call site.
    configureFormatting({
        locale: hotelConfig?.locale,
        currency: currentHotel?.currency,
    });

    return (
        <AppLayoutTemplate breadcrumbs={breadcrumbs}>
            {children}
        </AppLayoutTemplate>
    );
}
