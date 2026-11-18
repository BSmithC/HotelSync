<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('areas', function (Blueprint $table) {
            $table->foreignId('building_id')->nullable()->after('hotel_id')->constrained()->nullOnDelete();
            $table->string('type', 30)->default('zona')->after('name');
            $table->string('color', 20)->nullable()->after('type');
            $table->unsignedSmallInteger('floor')->nullable()->after('color');
            $table->boolean('active')->default(true)->after('floor');

            $table->index(['hotel_id', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('areas', function (Blueprint $table) {
            $table->dropIndex(['hotel_id', 'type']);
            $table->dropConstrainedForeignId('building_id');
            $table->dropColumn(['type', 'color', 'floor', 'active']);
        });
    }
};
