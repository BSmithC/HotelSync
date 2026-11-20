import { welcomeGalleryImages } from '@/components/welcome/media';

export default function WelcomeGallery() {
    return (
        <section
            className="bg-muted/30 py-20 sm:py-28"
            aria-labelledby="gallery-title"
        >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
                            Espacios
                        </p>
                        <h2
                            id="gallery-title"
                            className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
                        >
                            Un vistazo a los ambientes
                        </h2>
                    </div>
                    <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                        Composición visual de habitaciones y áreas comunes. Las
                        fotografías son ilustrativas.
                    </p>
                </div>

                <div className="mt-10 grid auto-rows-[11rem] grid-cols-2 gap-3 sm:auto-rows-[14rem] sm:gap-4 lg:grid-cols-3">
                    {welcomeGalleryImages.map((image, index) => (
                        <figure
                            key={image.src}
                            className={`relative overflow-hidden rounded-xl border border-border bg-background shadow-sm ${
                                index === 0 ? 'col-span-2 row-span-2' : ''
                            }`}
                        >
                            <img
                                src={image.src}
                                alt={image.alt}
                                loading="lazy"
                                className="size-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                            />
                            {image.caption ? (
                                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-sidebar/85 to-transparent px-4 pt-10 pb-3 text-xs font-medium text-primary-foreground">
                                    {image.caption}
                                </figcaption>
                            ) : null}
                        </figure>
                    ))}
                </div>
            </div>
        </section>
    );
}
