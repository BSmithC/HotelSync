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
        Schema::create('beds', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->integer('capacity');
            $table->foreignId('area_id')->constrained('areas')->references('id');
            $table->integer('pos_x')->nullable();
            $table->string('shape')->default('circle');
            $table->integer('pos_y')->nullable();
            $table->integer('width')->nullable();
            $table->integer('height')->nullable();
            $table->integer('rotation')->nullable()->default(0);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('beds');
    }
};
