import { usePage } from '@inertiajs/react';

import { Separator } from '@/components/ui/separator';
import {
    welcomeAboutBottom,
    welcomeAboutLarge,
    welcomeAboutTop,
} from '@/components/welcome/media';

export default function WelcomeAbout() {
    const { hotelConfig } = usePage().props;

    return (
        <section
            id="nosotros"
            className="scroll-mt-16 border-t border-border/60 bg-background py-20 sm:py-28"
            aria-labelledby="about-title"
        >
            <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-20 lg:px-8">
                <div>
                    <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
                        Nuestra propuesta
                    </p>
                    <h2
                        id="about-title"
                        className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
                    >
                        Un espacio donde la comodidad y la atención van de la
                        mano.
                    </h2>
                    <p className="mt-6 leading-relaxed text-muted-foreground">
                        Una experiencia hotelera se construye con detalles
                        simples y bien cuidados. Esta portada reúne la identidad
                        del sistema, sus accesos y una presentación sobria del
                        producto.
                    </p>
                    <p className="mt-4 leading-relaxed text-muted-foreground">
                        Las fotografías son ilustrativas. La información
                        definitiva del hotel aparecerá aquí cuando esté
                        disponible.
                    </p>

                    <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-6">
                        <div>
                            <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
                                Check-in
                            </p>
                            <p className="mt-1 text-lg font-semibold text-foreground">
                                {hotelConfig.check_in_time}
                            </p>
                        </div>
                        <Separator
                            orientation="vertical"
                            className="hidden h-11 sm:block"
                        />
                        <div>
                            <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
                                Check-out
                            </p>
                            <p className="mt-1 text-lg font-semibold text-foreground">
                                {hotelConfig.check_out_time}
                            </p>
                        </div>
                        <Separator
                            orientation="vertical"
                            className="hidden h-11 sm:block"
                        />
                        <div>
                            <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
                                Idioma
                            </p>
                            <p className="mt-1 text-lg font-semibold text-foreground">
                                {hotelConfig.locale}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid h-[22rem] grid-cols-[1.35fr_1fr] grid-rows-2 gap-3 sm:h-[29rem] sm:gap-4">
                    <img
                        src={welcomeAboutLarge.src}
                        alt={welcomeAboutLarge.alt}
                        loading="lazy"
                        className="row-span-2 size-full rounded-xl border border-border object-cover shadow-sm"
                    />
                    <img
                        src={welcomeAboutTop.src}
                        alt={welcomeAboutTop.alt}
                        loading="lazy"
                        className="size-full rounded-xl border border-border object-cover shadow-sm"
                    />
                    <img
                        src={welcomeAboutBottom.src}
                        alt={welcomeAboutBottom.alt}
                        loading="lazy"
                        className="size-full rounded-xl border border-border object-cover shadow-sm"
                    />
                </div>
            </div>
        </section>
    );
}
