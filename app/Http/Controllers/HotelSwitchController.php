<?php

namespace App\Http\Controllers;

use App\Models\Hotel;
use App\Support\CurrentHotel;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/**
 * Switches the active hotel for users that belong to more than one.
 */
class HotelSwitchController extends Controller
{
    public function __invoke(Request $request, Hotel $hotel, CurrentHotel $currentHotel): RedirectResponse
    {
        Gate::authorize('view', $hotel);

        abort_unless($hotel->active, 403, 'El hotel seleccionado está inactivo.');

        $request->session()->put('current_hotel_id', $hotel->id);
        $currentHotel->set($hotel->id);

        return back();
    }
}
