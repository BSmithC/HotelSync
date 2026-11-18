import { Head, router, useForm, usePage } from '@inertiajs/react';
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
import { formatCurrency } from '@/lib/format';
import type { HotelConfig } from '@/types';

export default function FinanceSettings({ config }: { config: HotelConfig }) {
    const { currentHotel, hotelConfig } = usePage().props;
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [resetting, setResetting] = useState(false);

    const { data, setData, patch, processing, errors, isDirty, setDefaults } =
        useForm({
            tax_rate: String(config.tax_rate),
            invoice_prefix: config.invoice_prefix,
        });

    useEffect(() => {
        const next = {
            tax_rate: String(config.tax_rate),
            invoice_prefix: config.invoice_prefix,
        };

        setDefaults(next);
        setData(next);
    }, [config.tax_rate, config.invoice_prefix, setDefaults, setData]);

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        patch('/settings/hotel/finance', { preserveScroll: true });
    };

    const restore = () => {
        router.patch(
            '/settings/hotel/finance/reset',
            {},
            {
                preserveScroll: true,
                onStart: () => setResetting(true),
                onFinish: () => setResetting(false),
                onSuccess: () => setConfirmOpen(false),
            },
        );
    };

    const rate = Number(data.tax_rate) || 0;
    const sampleSubtotal = 1000;
    const sampleTax = Math.round(sampleSubtotal * rate) / 100;
    const currency = currentHotel?.currency ?? 'DOP';
    const locale = hotelConfig?.locale ?? 'es-DO';

    return (
        <>
            <Head title="Configuración financiera" />

            <form onSubmit={submit}>
                <SettingsPanel
                    title="Configuración financiera"
                    description="Impuesto aplicado a las facturas nuevas y prefijo de numeración que usa el área de servicios."
                    dirty={isDirty}
                    footer={
                        <SettingsSaveBar
                            dirty={isDirty}
                            processing={processing || resetting}
                            onDiscard={() =>
                                setData({
                                    tax_rate: String(config.tax_rate),
                                    invoice_prefix: config.invoice_prefix,
                                })
                            }
                            onRestore={() => setConfirmOpen(true)}
                        />
                    }
                >
                    <FormSection
                        title="Impuesto"
                        description="Porcentaje que se suma al subtotal cuando se genera una factura desde una solicitud de servicio."
                    >
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="tax_rate">
                                    Tasa de impuesto (%)
                                </Label>
                                <Input
                                    id="tax_rate"
                                    type="number"
                                    min={0}
                                    max={30}
                                    step="0.01"
                                    value={data.tax_rate}
                                    onChange={(event) =>
                                        setData('tax_rate', event.target.value)
                                    }
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    Usa 0 si el hotel no aplica impuestos.
                                </p>
                                <InputError message={errors.tax_rate} />
                            </div>

                            <div className="grid gap-2">
                                <Label>Vista previa</Label>
                                <div className="space-y-1 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                                    <p className="flex justify-between gap-4">
                                        <span>Subtotal</span>
                                        <span>
                                            {formatCurrency(
                                                sampleSubtotal,
                                                currency,
                                                locale,
                                            )}
                                        </span>
                                    </p>
                                    <p className="flex justify-between gap-4">
                                        <span>Impuesto ({rate}%)</span>
                                        <span>
                                            {formatCurrency(
                                                sampleTax,
                                                currency,
                                                locale,
                                            )}
                                        </span>
                                    </p>
                                    <p className="flex justify-between gap-4 border-t pt-1 font-medium text-foreground">
                                        <span>Total</span>
                                        <span>
                                            {formatCurrency(
                                                sampleSubtotal + sampleTax,
                                                currency,
                                                locale,
                                            )}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </FormSection>

                    <FormSection
                        title="Numeración de facturas"
                        description="Prefijo que encabeza el número de las facturas generadas desde Servicios."
                    >
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="invoice_prefix">
                                    Prefijo de factura
                                </Label>
                                <Input
                                    id="invoice_prefix"
                                    value={data.invoice_prefix}
                                    onChange={(event) =>
                                        setData(
                                            'invoice_prefix',
                                            event.target.value.toUpperCase(),
                                        )
                                    }
                                    minLength={2}
                                    maxLength={8}
                                    placeholder="SRV"
                                    className="uppercase"
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    De 2 a 8 caracteres: letras mayúsculas y
                                    números.
                                </p>
                                <InputError message={errors.invoice_prefix} />
                            </div>

                            <div className="grid gap-2">
                                <Label>Ejemplo</Label>
                                <div className="flex h-9 items-center rounded-md border border-dashed px-3 text-sm text-muted-foreground">
                                    {data.invoice_prefix || 'SRV'}-20261118-0001
                                </div>
                            </div>
                        </div>
                    </FormSection>

                    <SettingsNotice tone="warning">
                        El impuesto y el prefijo solo se aplican a las facturas
                        nuevas. Las facturas y movimientos ya emitidos no se
                        recalculan ni se renumeran.
                    </SettingsNotice>
                </SettingsPanel>
            </form>

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Restaurar configuración financiera"
                description="El impuesto volverá a 0% y el prefijo de factura a su valor predeterminado. Esta acción queda registrada en la auditoría."
                confirmLabel="Restaurar"
                onConfirm={restore}
                processing={resetting}
            />
        </>
    );
}

FinanceSettings.layout = {
    breadcrumbs: [
        { title: 'Configuración', href: '/settings/profile' },
        { title: 'Hotel', href: '/settings/hotel/general' },
        { title: 'Finanzas', href: '/settings/hotel/finance' },
    ],
};
