<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Support\CurrentHotel;
use App\Support\Permission;
use App\Support\Role;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Roles resolved during this request, keyed by hotel id.
     *
     * Avoids repeating the same pivot query for every gate check.
     *
     * @var array<int, string|null>
     */
    protected array $roleCache = [];

    /**
     * Hotels (tenants) this user has access to.
     *
     * @return BelongsToMany<Hotel, $this>
     */
    public function hotels(): BelongsToMany
    {
        return $this->belongsToMany(Hotel::class)
            ->withPivot('role')
            ->withTimestamps();
    }

    /**
     * Role of this user inside the given hotel (null when not a member).
     */
    public function roleIn(Hotel $hotel): ?string
    {
        $hotelId = (int) $hotel->getKey();

        if (array_key_exists($hotelId, $this->roleCache)) {
            return $this->roleCache[$hotelId];
        }

        $role = $this->hotels()->whereKey($hotelId)->first()?->pivot?->getAttribute('role');

        return $this->roleCache[$hotelId] = $role === null ? null : (string) $role;
    }

    /**
     * Role enum of this user inside the given hotel.
     */
    public function roleEnumIn(?Hotel $hotel = null): ?Role
    {
        $hotel ??= app(CurrentHotel::class)->model();

        if ($hotel === null) {
            return null;
        }

        $role = $this->roleIn($hotel);

        return $role === null ? null : Role::tryFrom($role);
    }

    /**
     * Whether the user holds the given ability in the hotel of the request.
     *
     * The frontend only hides actions; this method is the real check used by
     * gates and policies.
     */
    public function hasPermission(Permission $permission, ?Hotel $hotel = null): bool
    {
        $role = $this->roleEnumIn($hotel);

        if ($role === null) {
            return false;
        }

        return in_array($role, $permission->roles(), true);
    }

    /**
     * Whether the user holds at least one of the given abilities.
     */
    public function hasAnyPermission(Permission ...$permissions): bool
    {
        foreach ($permissions as $permission) {
            if ($this->hasPermission($permission)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Ability values available in the hotel of the request, shared with Inertia.
     *
     * @return list<string>
     */
    public function permissionValues(?Hotel $hotel = null): array
    {
        $hotel ??= app(CurrentHotel::class)->model();

        if ($hotel === null) {
            return [];
        }

        $role = $this->roleEnumIn($hotel);

        if ($role === null) {
            return [];
        }

        return array_values(array_map(
            fn (Permission $permission) => $permission->value,
            array_filter(
                Permission::cases(),
                fn (Permission $permission) => in_array($role, $permission->roles(), true),
            ),
        ));
    }

    /**
     * Drop the memoized roles (used after changing the hotel matrix in place).
     */
    public function forgetRoleCache(): void
    {
        $this->roleCache = [];
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
