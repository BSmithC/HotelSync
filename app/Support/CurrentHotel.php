<?php

namespace App\Support;

use App\Models\Hotel;
use Illuminate\Support\Facades\Auth;

/**
 * Resolves the hotel (tenant) of the current request.
 *
 * Resolution order:
 *  1. An explicit value set by the middleware or by a test.
 *  2. The hotel stored in the session, only when the user belongs to it.
 *  3. The first hotel the authenticated user belongs to.
 */
class CurrentHotel
{
    private ?int $hotelId = null;

    private bool $resolved = false;

    public function id(): ?int
    {
        if ($this->resolved) {
            return $this->hotelId;
        }

        $this->hotelId = $this->resolveFromSession() ?? $this->resolveFromUser();
        $this->resolved = true;

        return $this->hotelId;
    }

    public function model(): ?Hotel
    {
        $hotelId = $this->id();

        return $hotelId === null ? null : Hotel::find($hotelId);
    }

    /**
     * Timezone configured for the hotel of the current request.
     */
    public function timezone(): string
    {
        $hotel = $this->model();

        return $hotel === null ? (string) config('app.timezone') : $hotel->timezone;
    }

    /**
     * Currency configured for the hotel of the current request.
     */
    public function currency(): string
    {
        $hotel = $this->model();

        return $hotel === null ? 'DOP' : $hotel->currency;
    }

    public function set(?int $hotelId): void
    {
        $this->hotelId = $hotelId;
        $this->resolved = true;
    }

    public function forget(): void
    {
        $this->hotelId = null;
        $this->resolved = false;
    }

    private function resolveFromSession(): ?int
    {
        if (! app()->bound('request') || ! request()->hasSession()) {
            return null;
        }

        $sessionHotelId = request()->session()->get('current_hotel_id');

        if ($sessionHotelId === null) {
            return null;
        }

        $user = Auth::user();

        if ($user === null || ! $user->hotels()->whereKey($sessionHotelId)->exists()) {
            request()->session()->forget('current_hotel_id');

            return null;
        }

        return (int) $sessionHotelId;
    }

    private function resolveFromUser(): ?int
    {
        $user = Auth::user();

        if ($user === null) {
            return null;
        }

        $hotelId = $user->hotels()->orderBy('hotels.id')->value('hotels.id');

        return $hotelId === null ? null : (int) $hotelId;
    }
}
