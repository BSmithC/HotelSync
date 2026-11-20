import { Link, usePage } from '@inertiajs/react';

import AppLogoIcon from '@/components/app-logo-icon';
import { authHero } from '@/components/auth/auth-media';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthBrandedLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const { name } = usePage().props;
    const year = new Date().getFullYear();

    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            <div className="relative hidden overflow-hidden bg-sidebar lg:flex lg:flex-col lg:justify-between lg:p-12">
                <img
                    src={authHero.src}
                    alt={authHero.alt}
                    className="absolute inset-0 size-full object-cover"
                    fetchPriority="high"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-sidebar via-sidebar/80 to-sidebar/25" />

                <Link
                    href={home()}
                    className="relative z-10 flex w-fit items-center gap-3 text-sidebar-primary-foreground"
                >
                    <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                        <AppLogoIcon className="size-5" />
                    </span>
                    <span className="flex flex-col leading-tight">
                        <span className="text-sm font-semibold">{name}</span>
                        <span className="text-xs text-sidebar-foreground/70">
                            Gestión hotelera
                        </span>
                    </span>
                </Link>

                <div className="relative z-10 max-w-md">
                    <p className="text-xs font-semibold tracking-[0.22em] text-primary-foreground/70 uppercase">
                        Experiencia HotelSync
                    </p>
                    <h2 className="mt-4 text-3xl leading-tight font-semibold tracking-tight text-primary-foreground sm:text-4xl">
                        Bienvenido de nuevo a una experiencia donde cada detalle
                        importa.
                    </h2>
                    <p className="mt-5 text-sm leading-relaxed text-primary-foreground/70">
                        Gestiona la operación diaria de tu hotel desde un solo
                        lugar.
                    </p>
                </div>

                <p className="relative z-10 text-xs text-primary-foreground/50">
                    Imagen ilustrativa.
                </p>
            </div>

            <div className="flex min-h-svh flex-col bg-background px-5 py-8 sm:px-10 lg:min-h-0 lg:px-12 lg:py-10">
                <div className="flex items-center justify-between">
                    <Link
                        href={home()}
                        className="flex items-center gap-2 lg:hidden"
                    >
                        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <AppLogoIcon className="size-4" />
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                            {name}
                        </span>
                    </Link>
                    <Link
                        href={home()}
                        className="hidden text-sm text-muted-foreground transition-colors hover:text-primary lg:inline-flex"
                    >
                        Volver al inicio
                    </Link>
                </div>

                <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
                    <div className="mb-8 flex flex-col gap-2">
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                            {title}
                        </h1>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                            {description}
                        </p>
                    </div>
                    {children}
                </div>

                <p className="text-center text-xs text-muted-foreground">
                    © {year} {name}. Todos los derechos reservados.
                </p>
            </div>
        </div>
    );
}
