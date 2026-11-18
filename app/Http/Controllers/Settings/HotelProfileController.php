<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Hotel;
use App\Services\AuditLogger;
use App\Support\CurrentHotel;
use App\Support\Permission;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Identity and contact data of the current hotel.
 *
 * These are real columns (not JSON settings) because they are consumed by the
 * hotel switcher, invoices and future public pages.
 */
class HotelProfileController extends Controller
{
    /**
     * @var list<string>
     */
    private const FIELDS = ['name', 'legal_name', 'rnc', 'address', 'phone', 'email'];

    public function edit(): Response
    {
        $this->authorize(Permission::SettingsManage->value);

        return Inertia::render('settings/hotel', [
            'hotel' => $this->hotel()->only(self::FIELDS),
        ]);
    }

    public function update(Request $request, AuditLogger $audit): RedirectResponse
    {
        $this->authorize(Permission::SettingsManage->value);

        $hotel = $this->hotel();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'legal_name' => ['nullable', 'string', 'max:160'],
            'rnc' => ['nullable', 'string', 'max:20', 'regex:/^[0-9-]*$/'],
            'address' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:160'],
        ]);

        $before = $hotel->only(self::FIELDS);

        $hotel->update($validated);

        $audit->record(
            module: 'settings',
            action: 'hotel_profile_updated',
            subject: $hotel,
            description: 'Información general del hotel actualizada',
            changes: [
                'before' => $before,
                'after' => $hotel->only(self::FIELDS),
            ],
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => 'La información del hotel se actualizó correctamente.']);

        return back();
    }

    private function hotel(): Hotel
    {
        $hotel = app(CurrentHotel::class)->model();

        abort_if($hotel === null, 404);

        return $hotel;
    }
}
