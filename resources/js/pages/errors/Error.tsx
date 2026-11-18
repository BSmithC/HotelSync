import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes';
import type { User } from '@/types';

const messages: Record<number, { title: string; description: string }> = {
    401: {
        title: 'No autenticado',
        description: 'Necesitas iniciar sesión para acceder a esta página.',
    },
    403: {
        title: 'Acceso denegado',
        description:
            'Tu usuario no tiene permisos para ver este recurso en el hotel activo.',
    },
    404: {
        title: 'Página no encontrada',
        description:
            'La dirección que buscas no existe o el registro fue movido.',
    },
    419: {
        title: 'Sesión expirada',
        description:
            'Tu sesión caducó por seguridad. Recarga la página e intenta de nuevo.',
    },
    429: {
        title: 'Demasiadas solicitudes',
        description:
            'Has realizado demasiadas peticiones en poco tiempo. Espera un momento.',
    },
    500: {
        title: 'Error interno',
        description:
            'Ocurrió un problema inesperado en el servidor. El equipo ya puede revisarlo.',
    },
    503: {
        title: 'Servicio no disponible',
        description:
            'El sistema está en mantenimiento o sobrecargado. Intenta más tarde.',
    },
};

export default function ErrorPage({ status }: { status: number }) {
    const { auth } = usePage().props as {
        auth?: { user?: User | null };
    };
    const message = messages[status] ?? messages[500];
    const homeHref = auth?.user ? dashboard() : '/';

    return (
        <>
            <Head title={`${status} · ${message.title}`} />

            <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background px-4 py-12">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(70,95,255,0.10),transparent_55%)]"
                />

                <div className="relative w-full max-w-md text-center">
                    <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                        Código {status}
                    </span>

                    <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                        {message.title}
                    </h1>

                    <p className="mt-2 text-sm text-muted-foreground">
                        {message.description}
                    </p>

                    <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => window.history.back()}
                        >
                            <ArrowLeft className="size-4" />
                            Volver atrás
                        </Button>
                        <Button asChild>
                            <Link href={homeHref}>
                                <Home className="size-4" />
                                {auth?.user
                                    ? 'Ir al dashboard'
                                    : 'Ir al inicio'}
                            </Link>
                        </Button>
                    </div>

                    <p className="mt-10 text-xs text-muted-foreground">
                        Si el problema continúa, contacta al administrador del
                        hotel.
                    </p>
                </div>
            </div>
        </>
    );
}
