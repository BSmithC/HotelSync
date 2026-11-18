<?php

namespace App\Support;

use App\Models\Hotel;

/**
 * Operational room states and their default palette.
 *
 * The palette can be overridden per hotel through `hotels.settings` so the
 * frontend and the backend always share the same colours.
 */
final class RoomStatus
{
    public const DISPONIBLE = 'disponible';

    public const OCUPADA = 'ocupada';

    public const RESERVADA = 'reservada';

    public const LIMPIEZA = 'limpieza';

    public const MANTENIMIENTO = 'mantenimiento';

    /**
     * @var list<string>
     */
    public const ALL = [
        self::DISPONIBLE,
        self::OCUPADA,
        self::RESERVADA,
        self::LIMPIEZA,
        self::MANTENIMIENTO,
    ];

    /**
     * @var array<string, string>
     */
    public const COLORS = [
        self::DISPONIBLE => '#12b76a',
        self::OCUPADA => '#f04438',
        self::RESERVADA => '#465fff',
        self::LIMPIEZA => '#f79009',
        self::MANTENIMIENTO => '#667085',
    ];

    /**
     * Palette for the current hotel, falling back to the defaults.
     *
     * @return array<string, string>
     */
    public static function colorsFor(?Hotel $hotel): array
    {
        $settings = $hotel?->settings;
        $overrides = is_array($settings) ? ($settings['room_status_colors'] ?? []) : [];

        if (! is_array($overrides)) {
            $overrides = [];
        }

        $colors = self::COLORS;

        foreach (self::ALL as $status) {
            $value = $overrides[$status] ?? null;

            if (is_string($value) && preg_match('/^#[0-9a-fA-F]{6}$/', $value) === 1) {
                $colors[$status] = $value;
            }
        }

        return $colors;
    }
}
