import { AppUserMenu } from '@/components/app-user-menu';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { GlobalSearch } from '@/components/global-search';
import { NotificationsMenu } from '@/components/notifications-menu';
import { ThemeToggle } from '@/components/theme-toggle';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppNavbar({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    return (
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-card/95 px-4 backdrop-blur-sm md:h-[72px] md:px-6">
            <SidebarTrigger className="-ml-1 size-9 text-muted-foreground hover:text-foreground" />

            <Separator
                orientation="vertical"
                className="mr-1 hidden h-6 sm:block"
            />

            <div className="hidden min-w-0 overflow-hidden sm:block">
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>

            <div className="ml-auto flex items-center gap-0.5">
                <GlobalSearch />
                <ThemeToggle />
                <NotificationsMenu />

                <Separator
                    orientation="vertical"
                    className="mx-1.5 hidden h-6 sm:block"
                />

                <AppUserMenu />
            </div>
        </header>
    );
}
