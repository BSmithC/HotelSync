<?php

namespace App\Http\Middleware;

use App\Support\CurrentHotel;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();
        $currentHotel = app(CurrentHotel::class)->model();

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user,
                'permissions' => $user === null ? [] : $user->permissionValues($currentHotel),
                'role' => $currentHotel === null
                    ? null
                    : $user?->roleEnumIn($currentHotel)?->value,
                'roleLabel' => $currentHotel === null
                    ? null
                    : $user?->roleEnumIn($currentHotel)?->label(),
            ],
            'currentHotel' => $currentHotel?->only(['id', 'name', 'slug']),
            'hotels' => $user === null
                ? []
                : $user->hotels()
                    ->orderBy('hotels.name')
                    ->get(['hotels.id', 'hotels.name', 'hotels.slug']),
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
