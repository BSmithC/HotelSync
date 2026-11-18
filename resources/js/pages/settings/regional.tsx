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
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';
import type { HotelConfig } from '@/types';

const LOCALE_LABELS: Record<string, string> = {
    'es-DO': 'Español (República Dominicana)',
    'es-ES': 'Español (España)',
    'es-MX': 'Español (México)',
    'en-US': 'English (United States)',
    'en-GB': 'English (United Kingdom)',
};

const CURRENCY_LABELS: Record<string, string> = {
    DOP: 'Peso dominicano (DOP)',
    USD: 'Dólar estadounidense (USD)',
    EUR: 'Euro (EUR)',
    MXN: 'Peso mexicano (MXN)',
    COP: 'Peso colombiano (COP)',
    PEN: 'Sol peruano (PEN)',
    ARS: 'Peso argentino (ARS)',
    CLP: 'Peso chileno (CLP)',
    BRL: 'Real brasileño (BRL)',
    GBP: 'Libra esterlina (GBP)',
    CAD: 'Dólar canadiense (CAD)',
};

export default function RegionalSettings({
    hotel,
    config,
    locales,
    currencies,
    timezones,
}: {
    hotel: { currency: string; timezone: string };
    config: HotelConfig;
    locales: string[];
    currencies: string[];
    timezones: string[];
}) {
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [resetting, setResetting] = useState(false);

    const { data, setData, patch, processing, errors, isDirty, setDefaults } =
        useForm({
            currency: hotel.currency ?? 'DOP',
            timezone: hotel.timezone ?? 'America/Santo_Domingo',
            locale: config.locale,
        });

    // After a save or a reset the shared props change; keep the form (and its
    // "dirty" baseline) aligned with the values the server actually stored.
    useEffect(() => {
        const next = {
            currency: hotel.currency ?? 'DOP',
            timezone: hotel.timezone ?? 'America/Santo_Domingo',
            locale: config.locale,
        };

        setDefaults(next);
        setData(next);
    }, [hotel.currency, hotel.timezone, config.locale, setDefaults, setData]);

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        patch('/settings/hotel/regional', { preserveScroll: true });
    };

    const restore = () => {
        router.patch(
            '/settings/hotel/regional/reset',
            {},
            {
                preserveScroll: true,
                onStart: () => setResetting(true),
                onFinish: () => setResetting(false),
                onSuccess: () => setConfirmOpen(false),
            },
        );
    };

    const sampleDate = '2026-11-18';

    return (
        <>
            <Head title="Configuración regional" />

            <form onSubmit={submit}>
                <SettingsPanel
                    title="Configuración regional"
                    description="Define cómo se muestran las fechas, los números y los importes en todo el sistema, y la zona horaria que usan las operaciones del hotel."
                    dirty={isDirty}
                    footer={
                        <SettingsSaveBar
                            dirty={isDirty}
                            processing={processing || resetting}
                            onDiscard={() =>
                                setData({
                                    currency: hotel.currency ?? 'DOP',
                                    timezone:
                                        hotel.timezone ??
                                        'America/Santo_Domingo',
                                    locale: config.locale,
                                })
                            }
                            onRestore={() => setConfirmOpen(true)}
                        />
                    }
                >
                    <FormSection
                        title="Moneda"
                        description="Se usa para mostrar importes en finanzas, facturas, servicios y reportes."
                    >
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="currency">Moneda</Label>
                                <Select
                                    value={data.currency}
                                    onValueChange={(value) =>
                                        setData('currency', value)
                                    }
                                >
                                    <SelectTrigger id="currency">
                                        <SelectValue placeholder="Selecciona una moneda" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {currencies.map((currency) => (
                                            <SelectItem
                                                key={currency}
                                                value={currency}
                                            >
                                                {CURRENCY_LABELS[currency] ??
                                                    currency}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.currency} />
                            </div>

                            <div className="grid gap-2">
                                <Label>Vista previa</Label>
                                <div className="flex h-9 items-center rounded-md border border-dashed px-3 text-sm text-muted-foreground">
                                    {formatCurrency(
                                        1234.5,
                                        data.currency,
                                        data.locale,
                                    )}
                                </div>
                            </div>
                        </div>
                    </FormSection>

                    <FormSection
                        title="Zona horaria"
                        description="Determina el momento del check-in, las fechas de hoy y los cortes de reportes."
                    >
                        <div className="grid gap-2 md:max-w-md">
                            <Label htmlFor="timezone">Zona horaria</Label>
                            <Select
                                value={data.timezone}
                                onValueChange={(value) =>
                                    setData('timezone', value)
                                }
                            >
                                <SelectTrigger id="timezone">
                                    <SelectValue placeholder="Selecciona una zona horaria" />
                                </SelectTrigger>
                                <SelectContent>
                                    {timezones.map((timezone) => (
                                        <SelectItem
                                            key={timezone}
                                            value={timezone}
                                        >
                                            {timezone}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={errors.timezone} />
                        </div>
                    </FormSection>

                    <FormSection
                        title="Idioma y formato"
                        description="Formato de fechas y separadores de miles y decimales."
                    >
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="locale">Idioma</Label>
                                <Select
                                    value={data.locale}
                                    onValueChange={(value) =>
                                        setData('locale', value)
                                    }
                                >
                                    <SelectTrigger id="locale">
                                        <SelectValue placeholder="Selecciona un idioma" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {locales.map((locale) => (
                                            <SelectItem
                                                key={locale}
                                                value={locale}
                                            >
                                                {LOCALE_LABELS[locale] ??
                                                    locale}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.locale} />
                            </div>

                            <div className="grid gap-2">
                                <Label>Vista previa</Label>
                                <div className="flex h-9 items-center rounded-md border border-dashed px-3 text-sm text-muted-foreground">
                                    {formatDate(sampleDate, data.locale)} ·{' '}
                                    {formatNumber(12345.67, data.locale)}
                                </div>
                            </div>
                        </div>
                    </FormSection>

                    <SettingsNotice>
                        La moneda, la zona horaria y el formato se aplican a lo
                        que se muestre de ahora en adelante. Las facturas y
                        movimientos ya registrados conservan los importes con
                        los que fueron emitidos.
                    </SettingsNotice>
                </SettingsPanel>
            </form>

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Restaurar configuración regional"
                description="La moneda, la zona horaria y el idioma volverán a sus valores predeterminados. Esta acción queda registrada en la auditoría."
                confirmLabel="Restaurar"
                onConfirm={restore}
                processing={resetting}
            />
        </>
    );
}

RegionalSettings.layout = {
    breadcrumbs: [
        { title: 'Configuración', href: '/settings/profile' },
        { title: 'Hotel', href: '/settings/hotel/general' },
        { title: 'Regional', href: '/settings/hotel/regional' },
    ],
};
