<?php

namespace App\Support;

use App\Models\Hotel;

/**
 * Typed view over the free-form `hotels.settings` JSON.
 *
 * Only the keys exposed here are considered configuration. Unknown keys are
 * preserved when writing, so newer sections can coexist with older ones.
 */
final class HotelConfig
{
    /**
     * Locales supported by the frontend formatters.
     *
     * @var list<string>
     */
    public const LOCALES = ['es-DO', 'es-ES', 'es-MX', 'en-US', 'en-GB'];

    /**
     * Currencies offered in the regional settings screen.
     *
     * @var list<string>
     */
    public const CURRENCIES = ['DOP', 'USD', 'EUR', 'MXN', 'COP', 'PEN', 'ARS', 'CLP', 'BRL', 'GBP', 'CAD'];

    /**
     * Common timezones for hotel operations. The current value is always
     * appended when it is not part of this list.
     *
     * @var list<string>
     */
    public const TIMEZONES = [
        'America/Santo_Domingo',
        'America/Puerto_Rico',
        'America/Havana',
        'America/New_York',
        'America/Chicago',
        'America/Denver',
        'America/Los_Angeles',
        'America/Mexico_City',
        'America/Bogota',
        'America/Lima',
        'America/Caracas',
        'America/Panama',
        'America/Sao_Paulo',
        'Europe/Madrid',
        'Europe/London',
        'UTC',
    ];

    public const DEFAULT_LOCALE = 'es-DO';

    public const DEFAULT_CURRENCY = 'DOP';

    public const DEFAULT_TIMEZONE = 'America/Santo_Domingo';

    public const DEFAULT_CHECK_IN_TIME = '15:00';

    public const DEFAULT_CHECK_OUT_TIME = '12:00';

    public const DEFAULT_MIN_NIGHTS = 0;

    public const DEFAULT_MAX_NIGHTS = 30;

    public const DEFAULT_TAX_RATE = 0.0;

    public const DEFAULT_INVOICE_PREFIX = 'SRV';

    /**
     * @return array{locale: string, check_in_time: string, check_out_time: string, min_nights: int, max_nights: int, tax_rate: float, invoice_prefix: string}
     */
    public static function defaults(): array
    {
        return [
            'locale' => self::DEFAULT_LOCALE,
            'check_in_time' => self::DEFAULT_CHECK_IN_TIME,
            'check_out_time' => self::DEFAULT_CHECK_OUT_TIME,
            'min_nights' => self::DEFAULT_MIN_NIGHTS,
            'max_nights' => self::DEFAULT_MAX_NIGHTS,
            'tax_rate' => self::DEFAULT_TAX_RATE,
            'invoice_prefix' => self::DEFAULT_INVOICE_PREFIX,
        ];
    }

    /**
     * Resolved configuration for a hotel, always safe to render.
     *
     * @return array{locale: string, check_in_time: string, check_out_time: string, min_nights: int, max_nights: int, tax_rate: float, invoice_prefix: string}
     */
    public static function for(?Hotel $hotel): array
    {
        $settings = $hotel?->settings;
        $settings = is_array($settings) ? $settings : [];

        $regional = self::section($settings, 'regional');
        $reservations = self::section($settings, 'reservations');
        $finance = self::section($settings, 'finance');
        $defaults = self::defaults();

        return [
            'locale' => self::localeValue($regional['locale'] ?? null) ?? $defaults['locale'],
            'check_in_time' => self::timeValue($reservations['check_in_time'] ?? null) ?? $defaults['check_in_time'],
            'check_out_time' => self::timeValue($reservations['check_out_time'] ?? null) ?? $defaults['check_out_time'],
            'min_nights' => self::intValue($reservations['min_nights'] ?? null) ?? $defaults['min_nights'],
            'max_nights' => self::intValue($reservations['max_nights'] ?? null) ?? $defaults['max_nights'],
            'tax_rate' => self::taxRateValue($finance['tax_rate'] ?? null) ?? $defaults['tax_rate'],
            'invoice_prefix' => self::prefixValue($finance['invoice_prefix'] ?? null) ?? $defaults['invoice_prefix'],
        ];
    }

    /**
     * Resolved configuration for the hotel of the current request.
     *
     * @return array{locale: string, check_in_time: string, check_out_time: string, min_nights: int, max_nights: int, tax_rate: float, invoice_prefix: string}
     */
    public static function current(): array
    {
        return self::for(app(CurrentHotel::class)->model());
    }

    /**
     * Persistable defaults for one settings section.
     *
     * @return array<string, mixed>
     */
    public static function sectionDefaults(string $section): array
    {
        return match ($section) {
            'regional' => ['locale' => self::DEFAULT_LOCALE],
            'reservations' => [
                'check_in_time' => self::DEFAULT_CHECK_IN_TIME,
                'check_out_time' => self::DEFAULT_CHECK_OUT_TIME,
                'min_nights' => self::DEFAULT_MIN_NIGHTS,
                'max_nights' => self::DEFAULT_MAX_NIGHTS,
            ],
            'finance' => [
                'tax_rate' => self::DEFAULT_TAX_RATE,
                'invoice_prefix' => self::DEFAULT_INVOICE_PREFIX,
            ],
            default => [],
        };
    }

    /**
     * @param  array<string, mixed>  $settings
     * @return array<string, mixed>
     */
    private static function section(array $settings, string $key): array
    {
        $value = $settings[$key] ?? null;

        return is_array($value) ? $value : [];
    }

    private static function localeValue(mixed $value): ?string
    {
        return is_string($value) && in_array($value, self::LOCALES, true) ? $value : null;
    }

    private static function timeValue(mixed $value): ?string
    {
        return is_string($value) && preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $value) === 1
            ? $value
            : null;
    }

    private static function intValue(mixed $value): ?int
    {
        if (! is_int($value) && ! (is_string($value) && ctype_digit($value))) {
            return null;
        }

        $number = (int) $value;

        return $number >= 0 && $number <= 365 ? $number : null;
    }

    private static function taxRateValue(mixed $value): ?float
    {
        if (! is_numeric($value)) {
            return null;
        }

        $rate = (float) $value;

        return $rate >= 0 && $rate <= 30 ? round($rate, 2) : null;
    }

    private static function prefixValue(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $prefix = strtoupper($value);

        return preg_match('/^[A-Z0-9]{2,8}$/', $prefix) === 1 ? $prefix : null;
    }
}
