<?php

namespace App\Policies;

use App\Models\Hotel;
use App\Models\User;

/**
 * Authorization for hotel (tenant) level operations.
 *
 * Tenant records are isolated through the global scope; this policy covers
 * actions performed on the hotel itself, such as switching or editing it.
 */
class HotelPolicy
{
    /**
     * Any member of the hotel can view it and work inside it.
     */
    public function view(User $user, Hotel $hotel): bool
    {
        return $user->hotels()->whereKey($hotel->id)->exists();
    }

    /**
     * Only owners and admins can change the hotel settings.
     */
    public function update(User $user, Hotel $hotel): bool
    {
        return in_array($user->roleIn($hotel), ['owner', 'admin'], true);
    }

    /**
     * Owners can remove other members or delete the hotel.
     */
    public function delete(User $user, Hotel $hotel): bool
    {
        return $user->roleIn($hotel) === 'owner';
    }
}
