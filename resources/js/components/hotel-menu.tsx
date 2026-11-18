import { router, usePage } from '@inertiajs/react';
import { Building2, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { HotelSharedProps, HotelSummary } from '@/types';

export function HotelMenu() {
    const { currentHotel, hotels } = usePage<HotelSharedProps>().props;

    if (!currentHotel || hotels.length <= 1) {
        return null;
    }

    const switchTo = (hotel: HotelSummary) => {
        if (hotel.id === currentHotel.id) {
            return;
        }

        router.post(`/hotels/${hotel.id}/switch`, {}, { preserveScroll: true });
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    className="hidden h-9 gap-2 rounded-lg px-2.5 lg:flex"
                >
                    <Building2 className="size-4 text-muted-foreground" />
                    <span className="max-w-36 truncate text-sm">
                        {currentHotel.name}
                    </span>
                    <ChevronsUpDown className="size-3.5 text-muted-foreground" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="text-[11px] tracking-wide text-muted-foreground uppercase">
                    Cambiar de hotel
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {hotels.map((hotel) => (
                    <DropdownMenuItem
                        key={hotel.id}
                        onSelect={() => switchTo(hotel)}
                        className="gap-2"
                    >
                        <Building2 className="size-4 text-muted-foreground" />
                        <span className="flex-1 truncate">{hotel.name}</span>
                        {hotel.id === currentHotel.id && (
                            <Check className="size-4 text-primary" />
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
