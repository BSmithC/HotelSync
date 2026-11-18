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

    const label = (
        <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">{currentHotel.name}</span>
            <span className="truncate text-xs text-muted-foreground">
                Hotel activo
            </span>
        </div>
    );

    if (hotels.length <= 1) {
        return (
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton size="lg" tooltip={currentHotel.name}>
                        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                            <Building2 className="size-4" />
                        </div>
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
                            className="data-[state=open]:bg-sidebar-accent"
                        >
                            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                <Building2 className="size-4" />
                            </div>
                            {label}
                            <ChevronsUpDown className="ml-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                        align="start"
                        side="bottom"
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                            Cambiar de hotel
                        </DropdownMenuLabel>
                        {hotels.map((hotel) => (
                            <DropdownMenuItem
                                key={hotel.id}
                                onSelect={() => switchTo(hotel)}
                                className="gap-2 p-2"
                            >
                                <Building2 className="size-4" />
                                <span className="flex-1 truncate">
                                    {hotel.name}
                                </span>
                                {hotel.id === currentHotel.id && (
                                    <Check className="size-4" />
                                )}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
