import { Head, useForm } from '@inertiajs/react';
import { Building2 } from 'lucide-react';
import { FormSection } from '@/components/form-section';
import InputError from '@/components/input-error';
import {
    SettingsPanel,
    SettingsSaveBar,
} from '@/components/settings/settings-panel';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type HotelProfile = {
    name: string;
    legal_name: string | null;
    rnc: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
};

export default function HotelGeneralSettings({
    hotel,
}: {
    hotel: HotelProfile;
}) {
    const { data, setData, patch, processing, errors, isDirty, setDefaults } =
        useForm({
            name: hotel.name ?? '',
            legal_name: hotel.legal_name ?? '',
            rnc: hotel.rnc ?? '',
            address: hotel.address ?? '',
            phone: hotel.phone ?? '',
            email: hotel.email ?? '',
        });

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        patch('/settings/hotel/general', {
            preserveScroll: true,
            onSuccess: () => setDefaults(),
        });
    };

    return (
        <>
            <Head title="Información del hotel" />

            <form onSubmit={submit}>
                <SettingsPanel
                    title="Información general"
                    description="Estos datos identifican al hotel en el selector de hoteles, las facturas y los reportes. Solo el propietario o un administrador pueden modificarlos."
                    dirty={isDirty}
                    footer={
                        <SettingsSaveBar
                            dirty={isDirty}
                            processing={processing}
                            onDiscard={() => setDefaults()}
                        />
                    }
                >
                    <FormSection
                        title="Identidad"
                        description="Nombre comercial y datos legales que aparecen en la documentación."
                    >
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nombre comercial</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(event) =>
                                        setData('name', event.target.value)
                                    }
                                    maxLength={120}
                                    required
                                    autoComplete="organization"
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="legal_name">Razón social</Label>
                                <Input
                                    id="legal_name"
                                    value={data.legal_name}
                                    onChange={(event) =>
                                        setData(
                                            'legal_name',
                                            event.target.value,
                                        )
                                    }
                                    maxLength={160}
                                />
                                <InputError message={errors.legal_name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="rnc">RNC</Label>
                                <Input
                                    id="rnc"
                                    value={data.rnc}
                                    onChange={(event) =>
                                        setData('rnc', event.target.value)
                                    }
                                    maxLength={20}
                                    inputMode="numeric"
                                    placeholder="000-00000-0"
                                />
                                <InputError message={errors.rnc} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="phone">Teléfono</Label>
                                <Input
                                    id="phone"
                                    value={data.phone}
                                    onChange={(event) =>
                                        setData('phone', event.target.value)
                                    }
                                    maxLength={30}
                                    autoComplete="tel"
                                />
                                <InputError message={errors.phone} />
                            </div>

                            <div className="grid gap-2 md:col-span-2">
                                <Label htmlFor="address">Dirección</Label>
                                <Input
                                    id="address"
                                    value={data.address}
                                    onChange={(event) =>
                                        setData('address', event.target.value)
                                    }
                                    maxLength={255}
                                    autoComplete="street-address"
                                />
                                <InputError message={errors.address} />
                            </div>

                            <div className="grid gap-2 md:col-span-2">
                                <Label htmlFor="email">
                                    Correo de contacto
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(event) =>
                                        setData('email', event.target.value)
                                    }
                                    maxLength={160}
                                    autoComplete="email"
                                />
                                <InputError message={errors.email} />
                            </div>
                        </div>
                    </FormSection>

                    <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                        <Building2 className="mt-0.5 size-4 shrink-0" />
                        <p>
                            El identificador del hotel (slug) no se modifica
                            desde aquí para no romper enlaces existentes.
                        </p>
                    </div>
                </SettingsPanel>
            </form>
        </>
    );
}

HotelGeneralSettings.layout = {
    breadcrumbs: [
        {
            title: 'Configuración',
            href: '/settings/profile',
        },
        {
            title: 'Hotel',
            href: '/settings/hotel/general',
        },
        {
            title: 'General',
            href: '/settings/hotel/general',
        },
    ],
};
