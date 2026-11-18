<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Hotel;
use App\Services\AuditLogger;
use App\Support\CurrentHotel;
use App\Support\HotelConfig;
use App\Support\Permission;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Regional, reservation and finance preferences of the current hotel.
 *
 * Everything here is stored in `hotels.settings` under a typed section and
 * merged with the user-provided JSON, so unrelated keys (room colors, future
 * sections) are preserved.
 */
class HotelPreferencesController extends Controller
{
    /**
     * @var list<string>
     */
    private const SECTIONS = ['regional', 'reservations', 'finance'];

    public function regional(): Response
    {
        $this->authorize(Permission::SettingsManage->value);

        $hotel = $this->hotel();

        return Inertia::render('settings/regional', [
            'hotel' => $hotel->only(['currency', 'timezone']),
            'config' => HotelConfig::for($hotel),
            'defaults' => HotelConfig::defaults(),
            'locales' => HotelConfig::LOCALES,
            'currencies' => $this->currencies($hotel->currency),
            'timezones' => $this->timezones($hotel->timezone),
        ]);
    }

    public function updateRegional(Request $request, AuditLogger $audit): RedirectResponse
    {
        $this->authorize(Permission::SettingsManage->value);

        $request->merge([
            'currency' => strtoupper(trim((string) $request->input('currency'))),
        ]);

        $validated = $request->validate([
            'currency' => ['required', 'string', 'size:3', 'regex:/^[A-Z]{3}$/'],
            'timezone' => ['required', 'string', 'timezone'],
            'locale' => ['required', 'string', Rule::in(HotelConfig::LOCALES)],
        ]);

        $hotel = $this->hotel();
        $before = [
            'currency' => $hotel->currency,
            'timezone' => $hotel->timezone,
            'locale' => HotelConfig::for($hotel)['locale'],
        ];

        $settings = $this->settings($hotel);
        $settings['regional'] = ['locale' => $validated['locale']];

        $hotel->update([
            'currency' => $validated['currency'],
            'timezone' => $validated['timezone'],
            'settings' => $settings,
        ]);

        $audit->record(
            module: 'settings',
            action: 'regional_updated',
            subject: $hotel,
            description: 'Configuración regional del hotel actualizada',
            changes: [
                'before' => $before,
                'after' => [
                    'currency' => $validated['currency'],
                    'timezone' => $validated['timezone'],
                    'locale' => $validated['locale'],
                ],
            ],
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => 'La configuración regional se guardó correctamente.']);

        return back();
    }

    public function reservations(): Response
    {
        $this->authorize(Permission::SettingsManage->value);

        $hotel = $this->hotel();

        return Inertia::render('settings/reservations', [
            'config' => HotelConfig::for($hotel),
            'defaults' => HotelConfig::defaults(),
        ]);
    }

    public function updateReservations(Request $request, AuditLogger $audit): RedirectResponse
    {
        $this->authorize(Permission::SettingsManage->value);

        $validated = $request->validate([
            'check_in_time' => ['required', 'date_format:H:i'],
            'check_out_time' => ['required', 'date_format:H:i'],
            'min_nights' => ['required', 'integer', 'min:0', 'max:365'],
            'max_nights' => ['required', 'integer', 'min:0', 'max:365'],
        ]);

        if ((int) $validated['max_nights'] > 0 && (int) $validated['max_nights'] < (int) $validated['min_nights']) {
            throw ValidationException::withMessages([
                'max_nights' => 'La estancia máxima no puede ser menor que la estancia mínima.',
            ]);
        }

        $hotel = $this->hotel();
        $before = HotelConfig::for($hotel);

        $settings = $this->settings($hotel);
        $settings['reservations'] = [
            'check_in_time' => $validated['check_in_time'],
            'check_out_time' => $validated['check_out_time'],
            'min_nights' => (int) $validated['min_nights'],
            'max_nights' => (int) $validated['max_nights'],
        ];

        $hotel->update(['settings' => $settings]);

        $audit->record(
            module: 'settings',
            action: 'reservations_updated',
            subject: $hotel,
            description: 'Política de reservaciones del hotel actualizada',
            changes: [
                'before' => $before,
                'after' => HotelConfig::for($hotel),
            ],
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => 'La política de reservaciones se guardó correctamente.']);

        return back();
    }

    public function finance(): Response
    {
        $this->authorize(Permission::SettingsManage->value);

        $hotel = $this->hotel();

        return Inertia::render('settings/finance', [
            'config' => HotelConfig::for($hotel),
            'defaults' => HotelConfig::defaults(),
        ]);
    }

    public function updateFinance(Request $request, AuditLogger $audit): RedirectResponse
    {
        $this->authorize(Permission::SettingsManage->value);

        $request->merge([
            'invoice_prefix' => strtoupper(trim((string) $request->input('invoice_prefix'))),
        ]);

        $validated = $request->validate([
            'tax_rate' => ['required', 'numeric', 'min:0', 'max:30'],
            'invoice_prefix' => ['required', 'string', 'regex:/^[A-Z0-9]{2,8}$/'],
        ]);

        $hotel = $this->hotel();
        $before = HotelConfig::for($hotel);

        $settings = $this->settings($hotel);
        $settings['finance'] = [
            'tax_rate' => round((float) $validated['tax_rate'], 2),
            'invoice_prefix' => $validated['invoice_prefix'],
        ];

        $hotel->update(['settings' => $settings]);

        $audit->record(
            module: 'settings',
            action: 'finance_updated',
            subject: $hotel,
            description: 'Configuración financiera del hotel actualizada',
            changes: [
                'before' => $before,
                'after' => HotelConfig::for($hotel),
            ],
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => 'La configuración financiera se guardó correctamente.']);

        return back();
    }

    public function reset(string $section, AuditLogger $audit): RedirectResponse
    {
        $this->authorize(Permission::SettingsManage->value);

        abort_unless(in_array($section, self::SECTIONS, true), 404);

        $hotel = $this->hotel();
        $before = HotelConfig::for($hotel);

        $settings = $this->settings($hotel);
        $settings[$section] = HotelConfig::sectionDefaults($section);

        $values = ['settings' => $settings];

        if ($section === 'regional') {
            $values['currency'] = HotelConfig::DEFAULT_CURRENCY;
            $values['timezone'] = HotelConfig::DEFAULT_TIMEZONE;

            $before = [
                'currency' => $hotel->currency,
                'timezone' => $hotel->timezone,
                'locale' => $before['locale'],
            ];
        }

        $hotel->update($values);

        $audit->record(
            module: 'settings',
            action: "{$section}_reset",
            subject: $hotel,
            description: "Configuración de {$this->sectionLabel($section)} restaurada a los valores predeterminados",
            changes: [
                'before' => $before,
                'after' => $section === 'regional'
                    ? [
                        'currency' => $hotel->currency,
                        'timezone' => $hotel->timezone,
                        'locale' => HotelConfig::for($hotel)['locale'],
                    ]
                    : HotelConfig::for($hotel),
            ],
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Se restauraron los valores predeterminados.']);

        return back();
    }

    private function hotel(): Hotel
    {
        $hotel = app(CurrentHotel::class)->model();

        abort_if($hotel === null, 404);

        return $hotel;
    }

    /**
     * @return array<string, mixed>
     */
    private function settings(Hotel $hotel): array
    {
        return is_array($hotel->settings) ? $hotel->settings : [];
    }

    /**
     * @return list<string>
     */
    private function currencies(string $current): array
    {
        $currencies = HotelConfig::CURRENCIES;

        if (! in_array($current, $currencies, true)) {
            array_unshift($currencies, $current);
        }

        return $currencies;
    }

    /**
     * @return list<string>
     */
    private function timezones(string $current): array
    {
        $timezones = HotelConfig::TIMEZONES;

        if (! in_array($current, $timezones, true)) {
            array_unshift($timezones, $current);
        }

        return $timezones;
    }

    private function sectionLabel(string $section): string
    {
        return match ($section) {
            'regional' => 'configuración regional',
            'reservations' => 'reservaciones',
            'finance' => 'finanzas',
            default => $section,
        };
    }
}
