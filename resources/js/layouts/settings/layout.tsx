import { Link, usePage } from '@inertiajs/react';
import {
    BedDouble,
    Building2,
    CalendarClock,
    Globe2,
    Palette,
    Search,
    ShieldCheck,
    UserRound,
    Wallet,
} from 'lucide-react';
import { useState } from 'react';
import type { ComponentType, PropsWithChildren } from 'react';
import { PageHeader } from '@/components/page-header';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { usePermissions } from '@/hooks/use-permissions';
import { cn, toUrl } from '@/lib/utils';
import type { Permission } from '@/types';

type SettingsNavItem = {
    title: string;
    description: string;
    href: string;
    keywords: string[];
    icon: ComponentType<{ className?: string }>;
    permission?: Permission;
};

type SettingsNavGroup = {
    label: string;
    items: SettingsNavItem[];
};

const navGroups: SettingsNavGroup[] = [
    {
        label: 'Mi cuenta',
        items: [
            {
                title: 'Perfil',
                description: 'Tu nombre, correo y cuenta',
                href: '/settings/profile',
                keywords: ['perfil', 'nombre', 'correo', 'usuario', 'cuenta'],
                icon: UserRound,
            },
            {
                title: 'Seguridad',
                description: 'Contraseña y acceso',
                href: '/settings/security',
                keywords: ['seguridad', 'contraseña', 'password', 'acceso'],
                icon: ShieldCheck,
            },
            {
                title: 'Apariencia',
                description: 'Tema claro u oscuro',
                href: '/settings/appearance',
                keywords: ['apariencia', 'tema', 'claro', 'oscuro', 'color'],
                icon: Palette,
            },
        ],
    },
    {
        label: 'Hotel',
        items: [
            {
                title: 'General',
                description: 'Identidad y datos fiscales',
                href: '/settings/hotel/general',
                keywords: [
                    'general',
                    'hotel',
                    'nombre',
                    'rnc',
                    'razón social',
                    'dirección',
                    'teléfono',
                ],
                icon: Building2,
                permission: 'settings.manage',
            },
            {
                title: 'Regional',
                description: 'Moneda, zona horaria e idioma',
                href: '/settings/hotel/regional',
                keywords: [
                    'regional',
                    'moneda',
                    'divisa',
                    'zona horaria',
                    'idioma',
                    'locale',
                ],
                icon: Globe2,
                permission: 'settings.manage',
            },
            {
                title: 'Reservaciones',
                description: 'Horarios y política de estancia',
                href: '/settings/hotel/reservations',
                keywords: [
                    'reservaciones',
                    'reservas',
                    'check-in',
                    'check-out',
                    'noches',
                    'estancia',
                ],
                icon: CalendarClock,
                permission: 'settings.manage',
            },
            {
                title: 'Finanzas',
                description: 'Impuestos y numeración',
                href: '/settings/hotel/finance',
                keywords: [
                    'finanzas',
                    'impuesto',
                    'itbis',
                    'tasa',
                    'factura',
                    'prefijo',
                ],
                icon: Wallet,
                permission: 'settings.manage',
            },
            {
                title: 'Habitaciones',
                description: 'Colores de los estados operativos',
                href: '/settings/hotel/rooms',
                keywords: [
                    'habitaciones',
                    'colores',
                    'estados',
                    'plano',
                    'limpieza',
                    'mantenimiento',
                ],
                icon: BedDouble,
                permission: 'settings.manage',
            },
        ],
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();
    const { can } = usePermissions();
    const { currentHotel } = usePage().props;
    const [query, setQuery] = useState('');

    const normalizedQuery = query.trim().toLowerCase();

    const visibleGroups = navGroups
        .map((group) => ({
            ...group,
            items: group.items.filter((item) => {
                if (item.permission && !can(item.permission)) {
                    return false;
                }

                if (normalizedQuery === '') {
                    return true;
                }

                return [item.title, item.description, ...item.keywords]
                    .join(' ')
                    .toLowerCase()
                    .includes(normalizedQuery);
            }),
        }))
        .filter((group) => group.items.length > 0);

    return (
        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6">
            <PageHeader
                title="Configuración"
                description="Administra tu cuenta y la configuración operativa del hotel activo."
            >
                {currentHotel && (
                    <div className="inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                        <Building2 className="size-3.5" />
                        {currentHotel.name}
                    </div>
                )}
            </PageHeader>

            <div className="mt-6 grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
                <aside className="min-w-0 space-y-5">
                    <div className="relative">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Buscar configuración…"
                            aria-label="Buscar configuración"
                            className="pl-9"
                        />
                    </div>

                    <nav className="space-y-5" aria-label="Configuración">
                        {visibleGroups.length === 0 && (
                            <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                                No encontramos ajustes con ese nombre.
                            </p>
                        )}

                        {visibleGroups.map((group) => (
                            <div key={group.label} className="space-y-1.5">
                                <p className="px-3 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                                    {group.label}
                                </p>
                                {group.items.map((item) => {
                                    const active = isCurrentOrParentUrl(
                                        item.href,
                                    );

                                    return (
                                        <Link
                                            key={toUrl(item.href)}
                                            href={item.href}
                                            className={cn(
                                                'flex items-start gap-3 rounded-lg px-3 py-2 transition-colors',
                                                active
                                                    ? 'bg-primary/10 text-primary'
                                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                            )}
                                        >
                                            <item.icon className="mt-0.5 size-4 shrink-0" />
                                            <span className="min-w-0">
                                                <span className="block text-sm font-medium">
                                                    {item.title}
                                                </span>
                                                <span
                                                    className={cn(
                                                        'block text-xs',
                                                        active
                                                            ? 'text-primary/80'
                                                            : 'text-muted-foreground',
                                                    )}
                                                >
                                                    {item.description}
                                                </span>
                                            </span>
                                        </Link>
                                    );
                                })}
                            </div>
                        ))}
                    </nav>

                    <div className="rounded-lg border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
                        Los ajustes de la sección <strong>Hotel</strong> se
                        aplican a todos los usuarios del hotel activo.
                    </div>
                </aside>

                <Separator className="lg:hidden" />

                <section className="min-w-0">{children}</section>
            </div>
        </div>
    );
}
