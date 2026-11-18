<?php

namespace Database\Seeders;

use App\Models\Hotel;
use App\Models\User;
use Hash;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the demo login and ask DemoDataSeeder to fill every module.
     *
     * The demo seeder is additive and idempotent, so running the seeders
     * again never duplicates the records or destroys existing data.
     *
     * Model events must stay enabled: the tenant trait uses the `creating`
     * hook to inherit the hotel, and the audit trail is written by the
     * domain services.
     */
    public function run(): void
    {
        $hotel = Hotel::query()->firstOrCreate(
            ['slug' => 'principal'],
            [
                'name' => 'Hotel Principal',
                'currency' => 'DOP',
                'timezone' => 'America/Santo_Domingo',
                'active' => true,
            ],
        );

        $user = User::query()->firstOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'password' => Hash::make('12345678'),
            ],
        );

        $user->hotels()->syncWithoutDetaching([
            $hotel->id => ['role' => 'owner'],
        ]);

        $user->forgetRoleCache();

        $this->call(DemoDataSeeder::class);
    }
}
