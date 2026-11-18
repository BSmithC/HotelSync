import { Link } from '@inertiajs/react';
import {
    Building,
    Building2,
    CalendarCheck,
    CalendarDays,
    HousePlug,
    LayoutGrid,
    Receipt,
    User,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { HotelSwitcher } from '@/components/hotel-switcher';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import type { NavGroup } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';

const navGroups: NavGroup[] = [
    {
        label: 'Operación',
        items: [
            {
                title: 'Dashboard',
                href: dashboard(),
                icon: LayoutGrid,
            },
            {
                title: 'Reservaciones',
                href: '/reservations',
                icon: CalendarCheck,
            },
            {
                title: 'Calendario',
                href: '/calendars',
                icon: CalendarDays,
            },
        ],
    },
    {
        label: 'Gestión',
        items: [
            {
                title: 'Clientes',
                href: '/clients',
                icon: User,
            },
            {
                title: 'Habitaciones',
                href: '/rooms',
                icon: HousePlug,
            },
            {
                title: 'Facturas',
                href: '/bills',
                icon: Receipt,
            },
        ],
    },
    {
        label: 'Estructura',
        items: [
            {
                title: 'Sucursales',
                href: '/branches',
                icon: Building2,
            },
            {
                title: 'Edificios',
                href: '/buildings',
                icon: Building,
            },
        ],
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader className="gap-3 border-b border-sidebar-border/60 pb-3">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                <HotelSwitcher />
            </SidebarHeader>

            <SidebarContent className="gap-1 pt-2">
                <NavMain groups={navGroups} />
            </SidebarContent>

            <SidebarFooter className="gap-2 border-t border-sidebar-border/60 pt-2">
                <NavFooter items={[]} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
