<?php

namespace App\Support;

/**
 * Types of zones that can be drawn on the hotel map.
 */
final class AreaType
{
    /**
     * @var list<string>
     */
    public const ALL = [
        'edificio',
        'piso',
        'zona',
        'pasillo',
        'jardin',
        'piscina',
        'terraza',
        'salon',
        'otro',
    ];
}
