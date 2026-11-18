import { Link } from '@inertiajs/react';
import {
    BedDouble,
    Building,
    Building2,
    CalendarCheck,
    CalendarDays,
    ChartBarBig,
    ConciergeBell,
    LayoutDashboard,
    Package,
    ReceiptText,
    Settings,
    Sparkles,
    UserCog,
    Users,
    Wallet,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { HotelSwitcher } from '@/components/hotel-switcher';
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
import { edit as editProfile } from '@/routes/profile';

const comingSoon = 'Pronto';

const navGroups: NavGroup[] = [
    {
        label: 'Operación',
        items: [
            {
                title: 'Dashboard',
                href: dashboard(),
                icon: LayoutDashboard,
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
            {
                title: 'Recepción',
                href: '/reception',
                icon: ConciergeBell,
                permission: 'reception.view',
            },
        ],
    },
    {
        label: 'Gestión',
        items: [
            {
                title: 'Huéspedes',
                href: '/clients',
                icon: Users,
            },
            {
                title: 'Habitaciones',
                href: '/rooms',
                icon: BedDouble,
            },
        ],
    },
    {
        label: 'Finanzas',
        items: [
            {
                title: 'Facturación',
                href: '/bills',
                icon: ReceiptText,
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
    {
        label: 'Próximamente',
        items: [
            {
                title: 'Finanzas',
                href: '/bills',
                icon: Wallet,
                disabled: true,
                badge: comingSoon,
            },
            {
                title: 'Inventario',
                href: '/rooms',
                icon: Package,
                disabled: true,
                badge: comingSoon,
            },
            {
                title: 'Servicios',
                href: '/rooms',
                icon: Sparkles,
                disabled: true,
                badge: comingSoon,
            },
            {
                title: 'Empleados',
                href: '/settings/profile',
                icon: UserCog,
                disabled: true,
                badge: comingSoon,
            },
            {
                title: 'Reportes',
                href: dashboard(),
                icon: ChartBarBig,
                disabled: true,
                badge: comingSoon,
            },
        ],
    },
    {
        label: 'Sistema',
        items: [
            {
                title: 'Configuración',
                href: editProfile(),
                icon: Settings,
            },
        ],
    },
];

export function AppSidebar() {
    return (
        <Sidebar
            collapsible="icon"
            variant="sidebar"
            className="border-sidebar-border"
        >
            <SidebarHeader className="gap-3 border-b border-sidebar-border/70 px-3 py-4">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            asChild
                            tooltip="HotelSync"
                            className="h-11 px-1 hover:bg-transparent data-[state=open]:hover:bg-transparent"
                        >
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                <HotelSwitcher />
            </SidebarHeader>

            <SidebarContent className="gap-0 px-1 py-2">
                <NavMain groups={navGroups} />
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border/70 p-3">
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
