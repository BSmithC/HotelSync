import { Form, Head } from '@inertiajs/react';
import { CircleCheck, TriangleAlert } from 'lucide-react';

import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

export default function Login({ status, canResetPassword }: Props) {
    return (
        <>
            <Head title="Iniciar sesión" />

            <div className="space-y-6">
                {status ? (
                    <Alert className="border-success/30 bg-success/10 text-success">
                        <CircleCheck />
                        <AlertDescription className="text-success">
                            {status}
                        </AlertDescription>
                    </Alert>
                ) : null}

                <Form
                    {...store.form()}
                    resetOnSuccess={['password']}
                    className="flex flex-col gap-6"
                >
                    {({ processing, errors }) => (
                        <div className="grid gap-5">
                            {Object.keys(errors).length > 0 ? (
                                <Alert className="border-destructive/30 bg-destructive/10 text-destructive">
                                    <TriangleAlert />
                                    <AlertDescription className="text-destructive">
                                        No pudimos iniciar tu sesión. Revisa tus
                                        credenciales e inténtalo de nuevo.
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
                                    tabIndex={1}
                                    autoComplete="email"
                                    placeholder="nombre@correo.com"
                                    disabled={processing}
                                    aria-invalid={Boolean(errors.email)}
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center gap-4">
                                    <Label htmlFor="password">Contraseña</Label>
                                    {canResetPassword ? (
                                        <TextLink
                                            href={request()}
                                            className="ml-auto text-sm"
                                            tabIndex={5}
                                        >
                                            ¿Olvidaste tu contraseña?
                                        </TextLink>
                                    ) : null}
                                </div>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                    placeholder="Tu contraseña"
                                    disabled={processing}
                                    aria-invalid={Boolean(errors.password)}
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center gap-3">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                    disabled={processing}
                                />
                                <Label
                                    htmlFor="remember"
                                    className="font-normal text-muted-foreground"
                                >
                                    Recordarme
                                </Label>
                            </div>

                            <Button
                                type="submit"
                                className="mt-1 w-full"
                                tabIndex={4}
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing ? <Spinner /> : null}
                                {processing
                                    ? 'Iniciando sesión...'
                                    : 'Iniciar sesión'}
                            </Button>
                        </div>
                    )}
                </Form>
            </div>
        </>
    );
}

Login.layout = {
    title: 'Bienvenido de nuevo',
    description: 'Inicia sesión para acceder a tu cuenta.',
};
