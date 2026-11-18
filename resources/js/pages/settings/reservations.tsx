import { Head, router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { FormSection } from '@/components/form-section';
import InputError from '@/components/input-error';
import {
    SettingsNotice,
    SettingsPanel,
    SettingsSaveBar,
} from '@/components/settings/settings-panel';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { HotelConfig } from '@/types';

export default function ReservationSettings({
    config,
}: {
    config: HotelConfig;
}) {
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [resetting, setResetting] = useState(false);

    const { data, setData, patch, processing, errors, isDirty, setDefaults } =
        useForm({
            check_in_time: config.check_in_time,
            check_out_time: config.check_out_time,
            min_nights: String(config.min_nights),
            max_nights: String(config.max_nights),
        });

    useEffect(() => {
        const next = {
            check_in_time: config.check_in_time,
            check_out_time: config.check_out_time,
            min_nights: String(config.min_nights),
            max_nights: String(config.max_nights),
        };

        setDefaults(next);
        setData(next);
    }, [
        config.check_in_time,
        config.check_out_time,
        config.min_nights,
        config.max_nights,
        setDefaults,
        setData,
    ]);

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        patch('/settings/hotel/reservations', { preserveScroll: true });
    };

    const restore = () => {
        router.patch(
            '/settings/hotel/reservations/reset',
            {},
            {
                preserveScroll: true,
                onStart: () => setResetting(true),
                onFinish: () => setResetting(false),
                onSuccess: () => setConfirmOpen(false),
            },
        );
    };

    return (
        <>
            <Head title="Política de reservaciones" />

            <form onSubmit={submit}>
                <SettingsPanel
                    title="Política de reservaciones"
                    description="Horarios de llegada y salida, y límites de estancia que se validan al crear o editar una reservación."
                    dirty={isDirty}
                    footer={
                        <SettingsSaveBar
                            dirty={isDirty}
                            processing={processing || resetting}
                            onDiscard={() =>
                                setData({
                                    check_in_time: config.check_in_time,
                                    check_out_time: config.check_out_time,
                                    min_nights: String(config.min_nights),
                                    max_nights: String(config.max_nights),
                                })
                            }
                            onRestore={() => setConfirmOpen(true)}
                        />
                    }
                >
                    <FormSection
                        title="Horarios"
                        description="Se muestran al personal y a los huéspedes como referencia del hotel."
                    >
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="check_in_time">
                                    Hora de check-in
                                </Label>
                                <Input
                                    id="check_in_time"
                                    type="time"
                                    value={data.check_in_time}
                                    onChange={(event) =>
                                        setData(
                                            'check_in_time',
                                            event.target.value,
                                        )
                                    }
                                    required
                                />
                                <InputError message={errors.check_in_time} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="check_out_time">
                                    Hora de check-out
                                </Label>
                                <Input
                                    id="check_out_time"
                                    type="time"
                                    value={data.check_out_time}
                                    onChange={(event) =>
                                        setData(
                                            'check_out_time',
                                            event.target.value,
                                        )
                                    }
                                    required
                                />
                                <InputError message={errors.check_out_time} />
                            </div>
                        </div>
                    </FormSection>

                    <FormSection
                        title="Duración de la estancia"
                        description="El servidor rechaza las reservaciones que queden fuera de estos límites."
                    >
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="min_nights">
                                    Estancia mínima (noches)
                                </Label>
                                <Input
                                    id="min_nights"
                                    type="number"
                                    min={0}
                                    max={365}
                                    step={1}
                                    value={data.min_nights}
                                    onChange={(event) =>
                                        setData(
                                            'min_nights',
                                            event.target.value,
                                        )
                                    }
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    Usa 0 para no exigir un mínimo.
                                </p>
                                <InputError message={errors.min_nights} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="max_nights">
                                    Estancia máxima (noches)
                                </Label>
                                <Input
                                    id="max_nights"
                                    type="number"
                                    min={0}
                                    max={365}
                                    step={1}
                                    value={data.max_nights}
                                    onChange={(event) =>
                                        setData(
                                            'max_nights',
                                            event.target.value,
                                        )
                                    }
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    Usa 0 para no imponer un máximo.
                                </p>
                                <InputError message={errors.max_nights} />
                            </div>
                        </div>
                    </FormSection>

                    <SettingsNotice>
                        Estos límites se validan en el servidor cuando se crea o
                        edita una reservación. No modifican las reservaciones
                        que ya existen. La capacidad máxima de huéspedes se
                        sigue controlando por habitación.
                    </SettingsNotice>
                </SettingsPanel>
            </form>

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Restaurar política de reservaciones"
                description="Los horarios y los límites de estancia volverán a sus valores predeterminados. Esta acción queda registrada en la auditoría."
                confirmLabel="Restaurar"
                onConfirm={restore}
                processing={resetting}
            />
        </>
    );
}

ReservationSettings.layout = {
    breadcrumbs: [
        { title: 'Configuración', href: '/settings/profile' },
        { title: 'Hotel', href: '/settings/hotel/general' },
        { title: 'Reservaciones', href: '/settings/hotel/reservations' },
    ],
};
