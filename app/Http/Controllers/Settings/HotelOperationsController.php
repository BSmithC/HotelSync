<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Hotel;
use App\Support\CurrentHotel;
use App\Support\Permission;
use App\Support\RoomStatus;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Operational preferences that already have a backend consumer, surfaced in
 * the settings center instead of being hidden inside the room map.
 */
class HotelOperationsController extends Controller
{
    public function edit(): Response
    {
        $this->authorize(Permission::SettingsManage->value);

        return Inertia::render('settings/rooms', [
            'colors' => RoomStatus::colorsFor($this->hotel()),
            'defaults' => RoomStatus::COLORS,
        ]);
    }

    private function hotel(): Hotel
    {
        $hotel = app(CurrentHotel::class)->model();

        abort_if($hotel === null, 404);

        return $hotel;
    }
}
