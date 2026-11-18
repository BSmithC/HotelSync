import { Head, router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
    SettingsNotice,
    SettingsPanel,
    SettingsSaveBar,
} from '@/components/settings/settings-panel';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    ROOM_STATUS_KEYS,
    roomStatusLabel,
    softColor,
} from '@/lib/room-status';
import type { RoomStatusColors, RoomStatusKey } from '@/types';

export default function RoomSettings({
    colors,
    defaults,
}: {
    colors: RoomStatusColors;
    defaults: RoomStatusColors;
}) {
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [resetting, setResetting] = useState(false);

    const { data, setData, patch, processing, errors, isDirty, setDefaults } =
        useForm<{ room_status_colors: RoomStatusColors }>({
            room_status_colors: colors,
        });

    useEffect(() => {
        const next = { room_status_colors: colors };

        setDefaults(next);
        setData(next);
    }, [colors, setDefaults, setData]);

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        patch('/hotels/current/settings', { preserveScroll: true });
    };

    const setColor = (key: RoomStatusKey, value: string) => {
        setData('room_status_colors', {
            ...data.room_status_colors,
            [key]: value,
        });
    };

    const restore = () => {
        router.patch(
            '/hotels/current/settings',
            { room_status_colors: defaults },
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
            <Head title="Colores de habitaciones" />

            <form onSubmit={submit}>
                <SettingsPanel
                    title="Estados de las habitaciones"
                    description="Colores que identifican cada estado operativo en el plano, la recepción y los listados."
                    dirty={isDirty}
                    footer={
                        <SettingsSaveBar
                            dirty={isDirty}
                            processing={processing || resetting}
                            onDiscard={() =>
                                setData({ room_status_colors: colors })
                            }
                            onRestore={() => setConfirmOpen(true)}
                            restoreLabel="Restaurar colores"
                        />
                    }
                >
                    <div className="grid gap-3 sm:grid-cols-2">
                        {ROOM_STATUS_KEYS.map((key) => {
                            const value = data.room_status_colors[key];
                            const fieldError = (
                                errors as Record<string, string | undefined>
                            )[`room_status_colors.${key}`];

                            return (
                                <div
                                    key={key}
                                    className="flex items-start gap-3 rounded-lg border p-3"
                                >
                                    <div
                                        className="mt-0.5 size-9 shrink-0 rounded-md border"
                                        style={{
                                            backgroundColor: softColor(
                                                value,
                                                '33',
                                            ),
                                            borderColor: value,
                                        }}
                                        aria-hidden="true"
                                    >
                                        <div
                                            className="m-1.5 size-6 rounded"
                                            style={{ backgroundColor: value }}
                                        />
                                    </div>

                                    <div className="min-w-0 flex-1 space-y-2">
                                        <Label
                                            htmlFor={`color-${key}`}
                                            className="block"
                                        >
                                            {roomStatusLabel(key)}
                                        </Label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                id={`color-${key}`}
                                                type="color"
                                                value={value}
                                                onChange={(event) =>
                                                    setColor(
                                                        key,
                                                        event.target.value,
                                                    )
                                                }
                                                className="h-9 w-10 shrink-0 cursor-pointer rounded border bg-transparent p-0.5"
                                                aria-label={`Color de ${roomStatusLabel(key)}`}
                                            />
                                            <Input
                                                value={value}
                                                onChange={(event) =>
                                                    setColor(
                                                        key,
                                                        event.target.value,
                                                    )
                                                }
                                                pattern="^#[0-9a-fA-F]{6}$"
                                                maxLength={7}
                                                className="font-mono uppercase"
                                                aria-label={`Código de color de ${roomStatusLabel(key)}`}
                                            />
                                        </div>
                                        {fieldError && (
                                            <p className="text-sm text-red-600 dark:text-red-400">
                                                {fieldError}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <SettingsNotice>
                        Los colores se guardan por hotel y se aplican de
                        inmediato a todos los usuarios. El plano y la recepción
                        los leen del servidor, así que no hace falta recargar la
                        página.
                    </SettingsNotice>
                </SettingsPanel>
            </form>

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Restaurar colores predeterminados"
                description="Los cinco estados volverán a la paleta original. Esta acción queda registrada en la auditoría."
                confirmLabel="Restaurar"
                onConfirm={restore}
                processing={resetting}
            />
        </>
    );
}

RoomSettings.layout = {
    breadcrumbs: [
        { title: 'Configuración', href: '/settings/profile' },
        { title: 'Hotel', href: '/settings/hotel/general' },
        { title: 'Habitaciones', href: '/settings/hotel/rooms' },
    ],
};
