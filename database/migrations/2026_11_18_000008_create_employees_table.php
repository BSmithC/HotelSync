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
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hotel_id')->constrained()->cascadeOnDelete();
            // Optional link to a platform user. Creating an employee never
            // creates an account: access is assigned explicitly by the module.
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('first_name', 80);
            $table->string('last_name', 80);
            $table->string('cedula', 20)->nullable();
            $table->date('birth_date')->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('email', 120)->nullable();
            $table->string('address', 200)->nullable();
            $table->string('position', 80);
            $table->string('department', 40)->default('otro');
            $table->date('hire_date');
            $table->string('status', 20)->default('activo');
            $table->decimal('salary', 12, 2)->nullable();
            $table->string('bank_account', 60)->nullable();
            $table->string('emergency_contact_name', 120)->nullable();
            $table->string('emergency_contact_phone', 30)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            // Historical records are never deleted: duplicates are prevented
            // per hotel while the same person can exist in another hotel.
            $table->unique(['hotel_id', 'cedula']);
            $table->unique(['hotel_id', 'user_id']);
            $table->index(['hotel_id', 'status']);
            $table->index(['hotel_id', 'department']);
            $table->index(['hotel_id', 'hire_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};
