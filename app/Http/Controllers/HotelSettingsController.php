<?php

namespace App\Http\Controllers;

use App\Services\AuditLogger;
use App\Support\CurrentHotel;
use App\Support\Permission;
use App\Support\RoomStatus;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class HotelSettingsController extends Controller
{
    /**
     * Update the operational preferences of the current hotel.
     */
    public function update(Request $request): RedirectResponse
    {
        $this->authorize(Permission::RoomsLayout->value);

        $hotel = app(CurrentHotel::class)->model();

        abort_if($hotel === null, 404);

        $validated = $request->validate([
            'room_status_colors' => [
                'required',
                'array:'.implode(',', RoomStatus::ALL),
                'required_array_keys:'.implode(',', RoomStatus::ALL),
            ],
            'room_status_colors.*' => ['required', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
        ]);

        $settings = $hotel->settings ?? [];
        $current = $settings['room_status_colors'] ?? [];
        $settings['room_status_colors'] = array_merge(
            is_array($current) ? $current : [],
            $validated['room_status_colors'],
        );

        $hotel->update(['settings' => $settings]);

        app(AuditLogger::class)->record(
            module: 'rooms',
            action: 'colors_updated',
            subject: $hotel,
            description: 'Colores de estado de habitaciones actualizados',
            changes: ['room_status_colors' => $validated['room_status_colors']],
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Los colores se actualizaron correctamente.']);

        return back();
    }
}
