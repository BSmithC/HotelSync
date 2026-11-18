import { usePage } from '@inertiajs/react';

import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    const { name } = usePage().props;

    return (
        <>
            <div className="flex aspect-square size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm ring-1 shadow-primary/25 ring-white/10">
                <AppLogoIcon className="size-5 fill-current text-primary-foreground" />
            </div>
            <div className="ml-2.5 grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-semibold tracking-tight text-white">
                    {name}
                </span>
                <span className="truncate text-[10px] font-medium tracking-[0.14em] text-sidebar-foreground/50 uppercase">
                    Gestión hotelera
                </span>
            </div>
        </>
    );
}
