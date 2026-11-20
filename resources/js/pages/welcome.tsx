import { Head, usePage } from '@inertiajs/react';

import WelcomeAbout from '@/components/welcome/welcome-about';
import WelcomeFooter from '@/components/welcome/welcome-footer';
import WelcomeGallery from '@/components/welcome/welcome-gallery';
import WelcomeHeader from '@/components/welcome/welcome-header';
import WelcomeHero from '@/components/welcome/welcome-hero';

export default function Welcome() {
    const { auth, name } = usePage().props;
    const authenticated = auth.user !== null;

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Head title="Inicio">
                <meta
                    name="description"
                    content="Portada de acceso al sistema de gestión hotelera HotelSync."
                />
                <meta property="og:type" content="website" />
                <meta property="og:title" content={`Bienvenido a ${name}`} />
                <meta
                    property="og:description"
                    content="Conoce el sistema y accede a tu panel de gestión hotelera."
                />
            </Head>

            <WelcomeHeader appName={name} authenticated={authenticated} />
            <main>
                <WelcomeHero appName={name} authenticated={authenticated} />
                <WelcomeAbout />
                <WelcomeGallery />
            </main>
            <WelcomeFooter appName={name} authenticated={authenticated} />
        </div>
    );
}
