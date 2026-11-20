import { Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { welcomeHero } from '@/components/welcome/media';
import { dashboard, login } from '@/routes';

type Props = {
    appName: string;
    authenticated: boolean;
};

export default function WelcomeHero({ appName, authenticated }: Props) {
    const accessHref = authenticated ? dashboard() : login();
    const accessLabel = authenticated ? 'Ir al panel' : 'Iniciar sesión';

    return (
        <section
            id="inicio"
            className="relative isolate scroll-mt-16 overflow-hidden bg-sidebar"
            aria-labelledby="hero-title"
        >
            <img
                src={welcomeHero.src}
                alt={welcomeHero.alt}
                className="absolute inset-0 size-full object-cover"
                fetchPriority="high"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-sidebar via-sidebar/85 to-sidebar/20" />

            <div className="relative mx-auto flex min-h-[34rem] max-w-7xl flex-col justify-center px-4 py-24 sm:px-6 lg:min-h-[42rem] lg:px-8">
                <div className="max-w-2xl">
                    <p className="text-xs font-semibold tracking-[0.22em] text-primary-foreground/70 uppercase">
                        Bienvenido a {appName}
                    </p>
                    <h1
                        id="hero-title"
                        className="mt-6 text-4xl leading-[1.08] font-semibold tracking-tight text-primary-foreground sm:text-5xl lg:text-6xl"
                    >
                        Bienvenido a una experiencia donde cada detalle importa.
                    </h1>
                    <p className="mt-6 max-w-xl text-base leading-relaxed text-primary-foreground/75 sm:text-lg">
                        Descubre un espacio diseñado para ofrecer comodidad,
                        atención y una experiencia inolvidable.
                    </p>

                    <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Button asChild size="lg">
                            <Link href={accessHref}>
                                {accessLabel}
                                <ArrowRight />
                            </Link>
                        </Button>
                        <Button
                            asChild
                            size="lg"
                            variant="outline"
                            className="border-primary-foreground/30 bg-primary-foreground/5 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
                        >
                            <Link href="#nosotros">Conocer el hotel</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
}
