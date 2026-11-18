import type { Auth } from '@/types/auth';
import type { HotelConfig, HotelSummary } from '@/types/hotel';
import type { RoomStatusColors } from '@/types/room';

declare module 'react' {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            sidebarOpen: boolean;
            roomStatusColors: RoomStatusColors;
            currentHotel: HotelSummary | null;
            hotels: HotelSummary[];
            hotelConfig: HotelConfig;
            hotelConfigDefaults: HotelConfig;
            [key: string]: unknown;
        };
    }
}
