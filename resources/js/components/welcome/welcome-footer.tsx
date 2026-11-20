import { Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';

import AppLogoIcon from '@/components/app-logo-icon';
import { Button } from '@/components/ui/button';
import { dashboard, login } from '@/routes';

type Props = {
    appName: string;
    authenticated: boolean;
};

export default function WelcomeFooter({ appName, authenticated }: Props) {
    const year = new Date().getFullYear();
    const accessHref = authenticated ? dashboard() : login();
    const accessLabel = authenticated ? 'Ir al panel' : 'Iniciar sesión';

    return (
        <footer
            id="contacto"
            className="scroll-mt-16 bg-sidebar text-sidebar-foreground"
        >
            <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                <div className="grid gap-12 md:grid-cols-3">
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                                <AppLogoIcon className="size-5" />
                            </span>
                            <span className="flex flex-col leading-tight">
                                <span className="text-sm font-semibold text-sidebar-primary-foreground">
                                    {appName}
                                </span>
                                <span className="text-xs text-sidebar-foreground/70">
                                    Gestión hotelera
                                </span>
                            </span>
                        </div>
                        <p className="mt-5 max-w-xs text-sm leading-relaxed text-sidebar-foreground/70">
                            Una portada sobria para presentar el sistema y dar
                            acceso al panel de gestión.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-sm font-semibold text-sidebar-primary-foreground">
                            Contacto
                        </h2>
                        <p className="mt-4 max-w-xs text-sm leading-relaxed text-sidebar-foreground/70">
                            La dirección, el teléfono y el correo del hotel se
                            mostrarán aquí cuando estén configurados en el
                            perfil del hotel.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-sm font-semibold text-sidebar-primary-foreground">
                            Enlaces
                        </h2>
                        <nav
                            className="mt-4 flex flex-col items-start gap-3"
                            aria-label="Enlaces del pie de página"
                        >
                            <Link
                                href="#inicio"
                                className="text-sm text-sidebar-foreground/70 transition-colors hover:text-sidebar-primary-foreground"
                            >
                                Inicio
                            </Link>
                            <Link
                                href="#nosotros"
                                className="text-sm text-sidebar-foreground/70 transition-colors hover:text-sidebar-primary-foreground"
                            >
                                Nosotros
                            </Link>
                        </nav>
                        <Button asChild size="sm" className="mt-6">
                            <Link href={accessHref}>
                                {accessLabel}
                                <ArrowRight />
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="mt-12 flex flex-col gap-2 border-t border-sidebar-border pt-6 text-xs text-sidebar-foreground/60 sm:flex-row sm:items-center sm:justify-between">
                    <p>
                        © {year} {appName}. Todos los derechos reservados.
                    </p>
                    <p>
                        Las imágenes son ilustrativas y no representan
                        instalaciones reales.
                    </p>
                </div>
            </div>
        </footer>
    );
}
