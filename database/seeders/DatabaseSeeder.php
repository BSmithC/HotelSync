<?php

namespace Database\Seeders;

use App\Models\Hotel;
use App\Models\User;
use Hash;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed a demo user and attach it to the default hotel created by the
     * tenant migration, so a fresh install can log in immediately.
     */
    public function run(): void
    {
        $user = User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => Hash::make('12345678'),
        ]);

        $hotel = Hotel::query()->where('slug', 'principal')->first()
            ?? Hotel::query()->orderBy('id')->first();

        if ($hotel === null) {
            $hotel = Hotel::create([
                'name' => 'Hotel Principal',
                'slug' => 'principal',
                'currency' => 'DOP',
                'timezone' => 'America/Santo_Domingo',
                'active' => true,
            ]);
        }

        $user->hotels()->syncWithoutDetaching([
            $hotel->id => ['role' => 'owner'],
        ]);
    }
}
