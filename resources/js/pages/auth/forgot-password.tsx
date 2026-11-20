import { Form, Head } from '@inertiajs/react';
import { CircleCheck, TriangleAlert } from 'lucide-react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes';
import { email } from '@/routes/password';

export default function ForgotPassword({ status }: { status?: string }) {
    return (
        <>
            <Head title="Recuperar contraseña" />

            <div className="space-y-6">
                {status ? (
                    <Alert className="border-success/30 bg-success/10 text-success">
                        <CircleCheck />
                        <AlertDescription className="text-success">
                            {status}
                        </AlertDescription>
                    </Alert>
                ) : null}

                <Form {...email.form()} className="flex flex-col gap-6">
                    {({ processing, errors }) => (
                        <div className="grid gap-5">
                            {Object.keys(errors).length > 0 ? (
                                <Alert className="border-destructive/30 bg-destructive/10 text-destructive">
                                    <TriangleAlert />
                                    <AlertDescription className="text-destructive">
                                        No pudimos enviar el enlace. Revisa el
                                        correo e inténtalo de nuevo.
                                    </AlertDescription>
                                </Alert>
                            ) : null}

                            <div className="grid gap-2">
                                <Label htmlFor="email">
                                    Correo electrónico
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    autoComplete="email"
                                    placeholder="nombre@correo.com"
                                    disabled={processing}
                                    aria-invalid={Boolean(errors.email)}
                                />
                                <InputError message={errors.email} />
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={processing}
                                data-test="email-password-reset-link-button"
                            >
                                {processing ? <Spinner /> : null}
                                {processing
                                    ? 'Enviando enlace...'
                                    : 'Enviar enlace de recuperación'}
                            </Button>
                        </div>
                    )}
                </Form>

                <p className="text-center text-sm text-muted-foreground">
                    ¿Recordaste tu contraseña?{' '}
                    <TextLink href={login()}>
                        Volver al inicio de sesión
                    </TextLink>
                </p>
            </div>
        </>
    );
}

ForgotPassword.layout = {
    title: 'Restablece tu contraseña',
    description:
        'Ingresa tu correo electrónico y te enviaremos un enlace para restablecerla.',
};
