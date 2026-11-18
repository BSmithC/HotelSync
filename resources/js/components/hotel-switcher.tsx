import { router, usePage } from '@inertiajs/react';
import { Building2, Check, ChevronsUpDown } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import type { HotelSharedProps, HotelSummary } from '@/types';

const cardClass =
    'h-auto rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-sidebar-foreground shadow-xs transition-colors hover:bg-white/10 hover:text-white data-[state=open]:bg-white/10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:shadow-none';

export function HotelSwitcher() {
    const { currentHotel, hotels } = usePage<HotelSharedProps>().props;

    if (!currentHotel) {
        return null;
    }

    const switchTo = (hotel: HotelSummary) => {
        if (hotel.id === currentHotel.id) {
            return;
        }

        router.post(`/hotels/${hotel.id}/switch`, {}, { preserveScroll: true });
    };

    const hotelIcon = (
        <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white ring-1 ring-white/10">
            <Building2 className="size-4" />
        </div>
    );

    const label = (
        <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold text-white">
                {currentHotel.name}
            </span>
            <span className="flex items-center gap-1.5 truncate text-[11px] text-sidebar-foreground/55">
                <span className="size-1.5 shrink-0 rounded-full bg-emerald-400" />
                Hotel activo
            </span>
        </div>
    );

    if (hotels.length <= 1) {
        return (
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton
                        size="lg"
                        tooltip={currentHotel.name}
                        className={cardClass}
                    >
                        {hotelIcon}
                        {label}
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        );
    }

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            tooltip={currentHotel.name}
                            className={cardClass}
                        >
                            {hotelIcon}
                            {label}
                            <ChevronsUpDown className="ml-auto size-4 text-sidebar-foreground/45 group-data-[collapsible=icon]:hidden" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="min-w-56 rounded-xl"
                        align="start"
                        side="bottom"
                        sideOffset={6}
                    >
                        <DropdownMenuLabel className="text-[11px] tracking-wide text-muted-foreground uppercase">
                            Cambiar de hotel
                        </DropdownMenuLabel>
                        {hotels.map((hotel) => (
                            <DropdownMenuItem
                                key={hotel.id}
                                onSelect={() => switchTo(hotel)}
                                className="gap-2 rounded-lg p-2"
                            >
                                <Building2 className="size-4 text-muted-foreground" />
                                <span className="flex-1 truncate">
                                    {hotel.name}
                                </span>
                                {hotel.id === currentHotel.id && (
                                    <Check className="size-4 text-primary" />
                                )}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
