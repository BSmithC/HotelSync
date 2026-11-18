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
        Schema::table('buildings', function (Blueprint $table) {
            $table->foreignId('branch_id')->nullable()->after('hotel_id')->constrained()->nullOnDelete();
            $table->string('name')->default('')->after('branch_id');
            $table->string('address')->nullable()->after('name');
            $table->unsignedInteger('floors')->default(1)->after('address');
            $table->text('description')->nullable()->after('floors');
            $table->boolean('active')->default(true)->after('description');
        });

        Schema::table('bills', function (Blueprint $table) {
            $table->foreignId('client_id')->nullable()->after('hotel_id')->constrained()->nullOnDelete();
            $table->foreignId('reservation_id')->nullable()->after('client_id')->constrained()->nullOnDelete();
            $table->string('number')->default('')->after('reservation_id');
            $table->date('issued_at')->nullable()->after('number');
            $table->decimal('subtotal', 12, 2)->default(0)->after('issued_at');
            $table->decimal('tax', 12, 2)->default(0)->after('subtotal');
            $table->decimal('total', 12, 2)->default(0)->after('tax');
            $table->string('status')->default('Pendiente')->after('total');
            $table->text('notes')->nullable()->after('status');
            $table->boolean('active')->default(true)->after('notes');

            $table->unique(['hotel_id', 'number']);
        });

        Schema::table('bill_details', function (Blueprint $table) {
            $table->foreignId('bill_id')->after('id')->constrained()->cascadeOnDelete();
            $table->string('description')->default('')->after('bill_id');
            $table->unsignedInteger('quantity')->default(1)->after('description');
            $table->decimal('unit_price', 12, 2)->default(0)->after('quantity');
            $table->decimal('subtotal', 12, 2)->default(0)->after('unit_price');
        });

        Schema::table('calendar', function (Blueprint $table) {
            $table->foreignId('room_id')->nullable()->after('hotel_id')->constrained()->nullOnDelete();
            $table->foreignId('reservation_id')->nullable()->after('room_id')->constrained()->nullOnDelete();
            $table->string('title')->default('')->after('reservation_id');
            $table->text('description')->nullable()->after('title');
            $table->dateTime('starts_at')->nullable()->after('description');
            $table->dateTime('ends_at')->nullable()->after('starts_at');
            $table->string('type')->default('evento')->after('ends_at');
            $table->boolean('active')->default(true)->after('type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('calendar', function (Blueprint $table) {
            $table->dropConstrainedForeignId('room_id');
            $table->dropConstrainedForeignId('reservation_id');
            $table->dropColumn(['title', 'description', 'starts_at', 'ends_at', 'type', 'active']);
        });

        Schema::table('bill_details', function (Blueprint $table) {
            $table->dropConstrainedForeignId('bill_id');
            $table->dropColumn(['description', 'quantity', 'unit_price', 'subtotal']);
        });

        Schema::table('bills', function (Blueprint $table) {
            $table->dropUnique(['hotel_id', 'number']);
            $table->dropConstrainedForeignId('client_id');
            $table->dropConstrainedForeignId('reservation_id');
            $table->dropColumn(['number', 'issued_at', 'subtotal', 'tax', 'total', 'status', 'notes', 'active']);
        });

        Schema::table('buildings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('branch_id');
            $table->dropColumn(['name', 'address', 'floors', 'description', 'active']);
        });
    }
};
