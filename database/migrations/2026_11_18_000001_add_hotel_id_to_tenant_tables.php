<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tables that hold data belonging to a single hotel (tenant).
     *
     * @var list<string>
     */
    private array $tenantTables = [
        'clients',
        'areas',
        'rooms',
        'beds',
        'reservations',
        'branches',
        'bills',
        'buildings',
        'calendar',
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        foreach ($this->tenantTables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                // Nullable so existing rows can be backfilled before the foreign key is enforced.
                $table->foreignId('hotel_id')->nullable()->after('id')->constrained()->nullOnDelete();
            });
        }

        // Existing installations keep working: their data is assigned to one default hotel.
        $hotelId = DB::table('hotels')->where('slug', 'principal')->value('id');

        if ($hotelId === null) {
            $hotelId = DB::table('hotels')->insertGetId([
                'name' => 'Hotel Principal',
                'slug' => 'principal',
                'currency' => 'DOP',
                'timezone' => 'America/Santo_Domingo',
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        foreach ($this->tenantTables as $tableName) {
            DB::table($tableName)->whereNull('hotel_id')->update(['hotel_id' => $hotelId]);
        }

        foreach (DB::table('users')->orderBy('id')->pluck('id') as $userId) {
            DB::table('hotel_user')->insertOrIgnore([
                'hotel_id' => $hotelId,
                'user_id' => $userId,
                'role' => 'owner',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Client documents are unique inside each hotel, not globally.
        Schema::table('clients', function (Blueprint $table) {
            $table->dropUnique(['cedula']);
            $table->dropUnique(['rnc']);
        });

        Schema::table('clients', function (Blueprint $table) {
            $table->unique(['hotel_id', 'cedula']);
            $table->unique(['hotel_id', 'rnc']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropUnique(['hotel_id', 'cedula']);
            $table->dropUnique(['hotel_id', 'rnc']);
        });

        Schema::table('clients', function (Blueprint $table) {
            $table->unique(['cedula']);
            $table->unique(['rnc']);
        });

        foreach ($this->tenantTables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropConstrainedForeignId('hotel_id');
            });
        }
    }
};
