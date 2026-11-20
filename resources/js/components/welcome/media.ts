import type { WelcomeImage } from '@/types/welcome';

/**
 * Decorative stock photography used until the hotel publishes real images.
 * Every alt text says "imagen ilustrativa" so it is never presented as a
 * photograph of the actual property.
 */
const photo = (id: string, width: number): string =>
    `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=80`;

export const welcomeHero: WelcomeImage = {
    src: photo('photo-1566073771259-6a8506099945', 2000),
    alt: 'Hotel con piscina y áreas exteriores, imagen ilustrativa',
};

export const welcomeAboutLarge: WelcomeImage = {
    src: photo('photo-1611892440504-42a792e24d32', 1200),
    alt: 'Habitación luminosa, imagen ilustrativa',
};

export const welcomeAboutTop: WelcomeImage = {
    src: photo('photo-1551882547-ff40c63fe5fa', 700),
    alt: 'Zona de descanso de un hotel, imagen ilustrativa',
};

export const welcomeAboutBottom: WelcomeImage = {
    src: photo('photo-1582719478250-c89cae4dc85b', 700),
    alt: 'Interior de una habitación, imagen ilustrativa',
};

export const welcomeGalleryImages: WelcomeImage[] = [
    {
        src: photo('photo-1571896349842-33c89424de2d', 1400),
        alt: 'Área exterior de un hotel, imagen ilustrativa',
        caption: 'Áreas comunes',
    },
    {
        src: photo('photo-1590490360182-c33d57733427', 900),
        alt: 'Dormitorio de una habitación, imagen ilustrativa',
        caption: 'Habitaciones',
    },
    {
        src: photo('photo-1540518614846-7eded433c457', 900),
        alt: 'Interior acogedor de una habitación, imagen ilustrativa',
        caption: 'Espacios de descanso',
    },
];
