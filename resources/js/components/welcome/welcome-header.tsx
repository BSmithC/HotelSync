import { Link } from '@inertiajs/react';
import { ArrowRight, Menu } from 'lucide-react';

import AppLogoIcon from '@/components/app-logo-icon';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { dashboard, login } from '@/routes';

type Props = {
    appName: string;
    authenticated: boolean;
};

const links = [
    { label: 'Inicio', href: '#inicio' },
    { label: 'Nosotros', href: '#nosotros' },
    { label: 'Contacto', href: '#contacto' },
];

export default function WelcomeHeader({ appName, authenticated }: Props) {
    const accessHref = authenticated ? dashboard() : login();
    const accessLabel = authenticated ? 'Ir al panel' : 'Iniciar sesión';

    return (
        <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                <Link href="#inicio" className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                        <AppLogoIcon className="size-5" />
                    </span>
                    <span className="flex flex-col leading-tight">
                        <span className="text-sm font-semibold tracking-tight text-foreground">
                            {appName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            Gestión hotelera
                        </span>
                    </span>
                </Link>

                <nav
                    className="hidden items-center gap-8 md:flex"
                    aria-label="Navegación principal"
                >
                    {links.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                <div className="flex items-center gap-2">
                    <Button asChild size="sm" className="hidden md:inline-flex">
                        <Link href={accessHref}>
                            {accessLabel}
                            <ArrowRight />
                        </Link>
                    </Button>

                    <div className="md:hidden">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    aria-label="Abrir menú"
                                >
                                    <Menu />
                                </Button>
                            </SheetTrigger>
                            <SheetContent
                                side="right"
                                className="w-[min(86vw,20rem)]"
                            >
                                <SheetHeader>
                                    <SheetTitle>{appName}</SheetTitle>
                                </SheetHeader>
                                <nav
                                    className="flex flex-col gap-1 px-4"
                                    aria-label="Navegación móvil"
                                >
                                    {links.map((link) => (
                                        <SheetClose asChild key={link.href}>
                                            <Link
                                                href={link.href}
                                                className="rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                                            >
                                                {link.label}
                                            </Link>
                                        </SheetClose>
                                    ))}
                                </nav>
                                <div className="mt-auto p-4">
                                    <SheetClose asChild>
                                        <Button asChild className="w-full">
                                            <Link href={accessHref}>
                                                {accessLabel}
                                            </Link>
                                        </Button>
                                    </SheetClose>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </div>
        </header>
    );
}
