import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BedDouble,
    CalendarCheck,
    CalendarDays,
    ChartBarBig,
    CircleDollarSign,
    Plus,
    ReceiptText,
    UserPlus,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { index as billsIndex, create as createBill } from '@/routes/bills';
import { index as calendarsIndex } from '@/routes/calendars';
import {
    index as clientsIndex,
    create as createClient,
} from '@/routes/clients';
import {
    index as reservationsIndex,
    create as createReservation,
} from '@/routes/reservations';
import { index as roomsIndex } from '@/routes/rooms';
import type { HotelSharedProps } from '@/types';

type ModuleShortcut = {
    title: string;
    description: string;
    href: ReturnType<typeof reservationsIndex>;
    icon: LucideIcon;
};

const modules: ModuleShortcut[] = [
    {
        title: 'Reservaciones',
        description: 'Agenda, estados y detalle de cada reserva.',
        href: reservationsIndex(),
        icon: CalendarCheck,
    },
    {
        title: 'Habitaciones',
        description: 'Plano, disponibilidad y estado de las habitaciones.',
        href: roomsIndex(),
        icon: BedDouble,
    },
    {
        title: 'Huéspedes',
        description: 'Datos de contacto, documentos e historial.',
        href: clientsIndex(),
        icon: Users,
    },
    {
        title: 'Facturación',
        description: 'Facturas emitidas, totales y detalle de consumo.',
        href: billsIndex(),
        icon: ReceiptText,
    },
    {
        title: 'Calendario',
        description: 'Eventos y actividades vinculadas al hotel.',
        href: calendarsIndex(),
        icon: CalendarDays,
    },
];

const nextPhase = [
    'Ingresos del día y del mes',
    'Ocupación y habitaciones disponibles',
    'Próximos check-in y check-out',
    'Tendencia de reservaciones y comparativo de ingresos y gastos',
];

export default function Dashboard() {
    const { currentHotel } = usePage<HotelSharedProps>().props;

    return (
        <>
            <Head title="Dashboard" />

            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <PageHeader
                    title="Dashboard"
                    description={
                        currentHotel
                            ? `Resumen operativo de ${currentHotel.name}.`
                            : 'Resumen operativo del hotel activo.'
                    }
                    actions={
                        <>
                            <Button variant="outline" asChild>
                                <Link href={createClient()}>
                                    <UserPlus className="size-4" />
                                    Registrar huésped
                                </Link>
                            </Button>
                            <Button asChild>
                                <Link href={createReservation()}>
                                    <Plus className="size-4" />
                                    Nueva reservación
                                </Link>
                            </Button>
                        </>
                    }
                />

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {modules.map((module) => (
                        <Link
                            key={module.title}
                            href={module.href}
                            className="group rounded-xl border border-border bg-card p-5 shadow-xs transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <module.icon className="size-5" />
                                </div>
                                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                            </div>
                            <h2 className="mt-4 text-sm font-semibold text-foreground">
                                {module.title}
                            </h2>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {module.description}
                            </p>
                        </Link>
                    ))}

                    <Card className="border-dashed border-primary/30 bg-primary/5 shadow-none">
                        <CardContent className="flex h-full flex-col p-5">
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <ChartBarBig className="size-5" />
                            </div>
                            <h2 className="mt-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                                Métricas del hotel
                                <Badge
                                    variant="outline"
                                    className="border-primary/30 text-[10px] text-primary"
                                >
                                    Fase 3
                                </Badge>
                            </h2>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Los indicadores se conectarán al backend real
                                cuando se autorice el controlador del dashboard.
                            </p>
                        </CardContent>
                    </Card>
                </section>

                <section className="grid gap-4 lg:grid-cols-3">
                    <Card className="shadow-xs lg:col-span-2">
                        <CardContent className="p-5">
                            <div className="flex items-start gap-3">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                    <ChartBarBig className="size-5" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-semibold text-foreground">
                                        Dashboard conectado a datos reales
                                    </h2>
                                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                                        Esta pantalla es intencionalmente un
                                        punto de partida. No muestra cifras
                                        inventadas: cada tarjeta y gráfico se
                                        activará con el endpoint de métricas y
                                        las tablas de pagos y gastos.
                                    </p>
                                </div>
                            </div>

                            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                                {nextPhase.map((item) => (
                                    <li
                                        key={item}
                                        className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
                                    >
                                        <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>

                    <Card className="shadow-xs">
                        <CardContent className="p-5">
                            <h2 className="text-sm font-semibold text-foreground">
                                Accesos rápidos
                            </h2>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Solo módulos ya disponibles en el sistema.
                            </p>

                            <div className="mt-4 flex flex-col gap-1.5">
                                <QuickAction
                                    href={createReservation()}
                                    icon={CalendarCheck}
                                    label="Crear reservación"
                                />
                                <QuickAction
                                    href={createClient()}
                                    icon={Users}
                                    label="Registrar huésped"
                                />
                                <QuickAction
                                    href={createBill()}
                                    icon={CircleDollarSign}
                                    label="Emitir factura"
                                />
                                <QuickAction
                                    href={billsIndex()}
                                    icon={ReceiptText}
                                    label="Ver facturación"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </section>
            </div>
        </>
    );
}

function QuickAction({
    href,
    icon: Icon,
    label,
}: {
    href: ReturnType<typeof billsIndex>;
    icon: LucideIcon;
    label: string;
}) {
    return (
        <Link
            href={href}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
            <Icon className="size-4 shrink-0 text-primary" />
            <span className="flex-1">{label}</span>
            <ArrowRight className="size-3.5" />
        </Link>
    );
}
