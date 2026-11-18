<?php

namespace App\Http\Middleware;

use App\Support\CurrentHotel;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Ensures every authenticated request has a valid hotel (tenant) context.
 */
class ResolveCurrentHotel
{
    public function __construct(private readonly CurrentHotel $currentHotel) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null) {
            $this->currentHotel->forget();

            return $next($request);
        }

        $hotelIds = $user->hotels()->orderBy('hotels.id')->pluck('hotels.id');

        if ($hotelIds->isEmpty()) {
            abort(403, 'Tu usuario no tiene ningún hotel asignado.');
        }

        $sessionHotelId = $request->session()->get('current_hotel_id');
        $hotelId = $hotelIds->contains((int) $sessionHotelId)
            ? (int) $sessionHotelId
            : (int) $hotelIds->first();

        $request->session()->put('current_hotel_id', $hotelId);
        $this->currentHotel->set($hotelId);

        return $next($request);
    }
}
