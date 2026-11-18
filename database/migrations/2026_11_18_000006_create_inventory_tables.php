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
        Schema::create('inventory_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hotel_id')->constrained()->cascadeOnDelete();
            $table->string('name', 120);
            $table->string('sku', 60)->nullable();
            $table->string('category', 30)->default('otro');
            $table->string('unit', 20)->default('unidad');
            $table->decimal('min_stock', 12, 2)->default(0);
            $table->decimal('unit_cost', 12, 2)->default(0);
            // Denormalised balance kept in sync by InventoryService inside the
            // same transaction as every movement, so lists can filter and sort.
            $table->decimal('stock', 12, 2)->default(0);
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->unique(['hotel_id', 'sku']);
            $table->index(['hotel_id', 'category']);
            $table->index(['hotel_id', 'active']);
        });

        Schema::create('inventory_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hotel_id')->constrained()->cascadeOnDelete();
            $table->foreignId('inventory_item_id')->constrained('inventory_items')->cascadeOnDelete();
            $table->string('type', 12);
            // Signed delta: positive adds stock, negative removes it.
            $table->decimal('quantity', 12, 2);
            $table->decimal('unit_cost', 12, 2)->nullable();
            $table->string('reason')->nullable();
            $table->string('reference')->nullable();
            $table->date('occurred_at');
            $table->string('idempotency_key', 64)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('voided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('voided_at')->nullable();
            $table->text('void_reason')->nullable();
            $table->foreignId('reversal_of_id')->nullable()->constrained('inventory_movements')->nullOnDelete();
            $table->timestamps();

            $table->unique(['hotel_id', 'idempotency_key']);
            $table->index(['hotel_id', 'inventory_item_id']);
            $table->index(['hotel_id', 'occurred_at']);
            $table->index(['hotel_id', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_movements');
        Schema::dropIfExists('inventory_items');
    }
};
