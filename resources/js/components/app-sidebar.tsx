import { Link, usePage } from '@inertiajs/react';
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
import { useEffect } from 'react';
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
    useSidebar,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { edit as editProfile } from '@/routes/profile';

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
            {
                title: 'Inventario',
                href: '/inventory',
                icon: Package,
                permission: 'inventory.view',
            },
            {
                title: 'Servicios',
                href: '/services',
                icon: Sparkles,
                permission: 'services.view',
            },
        ],
    },
    {
        label: 'Personas',
        items: [
            {
                title: 'Empleados',
                href: '/employees',
                icon: UserCog,
                permission: 'employees.view',
            },
        ],
    },
    {
        label: 'Finanzas',
        items: [
            {
                title: 'Finanzas',
                href: '/finance',
                icon: Wallet,
                permission: 'finance.view',
            },
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
        label: 'Análisis',
        items: [
            {
                title: 'Reportes',
                href: '/reports',
                icon: ChartBarBig,
                permission: 'reports.view',
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
    const { url } = usePage();
    const { isMobile, setOpenMobile } = useSidebar();

    // The mobile drawer lives outside the Inertia page, so it would stay open
    // over the new screen after tapping a link. Close it whenever the URL
    // changes.
    useEffect(() => {
        if (isMobile) {
            setOpenMobile(false);
        }
    }, [url, isMobile, setOpenMobile]);

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
