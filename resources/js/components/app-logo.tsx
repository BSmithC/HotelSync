import { usePage } from '@inertiajs/react';

import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    const { name } = usePage().props;

    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm ring-1 shadow-primary/30 ring-primary/20">
                <AppLogoIcon className="size-5 fill-current text-primary-foreground" />
            </div>
            <div className="ml-2 grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-semibold tracking-tight">
                    {name}
                </span>
                <span className="truncate text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                    Gestión hotelera
                </span>
            </div>
        </>
    );
}
