import { Link } from '@inertiajs/react';
import { Bell, BellOff, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function NotificationsMenu() {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 rounded-lg text-muted-foreground hover:text-foreground"
                    aria-label="Notificaciones"
                >
                    <Bell className="size-[18px]" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between px-4 py-3">
                    <DropdownMenuLabel className="p-0 text-sm font-semibold">
                        Notificaciones
                    </DropdownMenuLabel>
                    <span className="text-[11px] text-muted-foreground">
                        0 nuevas
                    </span>
                </div>
                <DropdownMenuSeparator className="m-0" />
                <div className="flex flex-col items-center px-6 py-8 text-center">
                    <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted">
                        <BellOff className="size-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">Sin notificaciones</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Las alertas de llegadas, salidas y pagos aparecerán aquí
                        cuando se conecten Recepción y Finanzas.
                    </p>
                </div>
                <DropdownMenuSeparator className="m-0" />
                <Link
                    href="/calendars"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium text-primary hover:underline"
                >
                    <CalendarDays className="size-3.5" />
                    Ver calendario
                </Link>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
