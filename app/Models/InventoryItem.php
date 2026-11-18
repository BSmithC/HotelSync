<?php

namespace App\Models;

use App\Models\Concerns\BelongsToHotel;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A stock-keeping unit of the hotel (supplies, amenities, food, linen…).
 *
 * The `stock` column is a balance cached from the append-only movement
 * ledger. It is only written by InventoryService, inside the same
 * transaction that inserts a movement, so it can never drift on its own.
 */
class InventoryItem extends Model
{
    use BelongsToHotel;

    /**
     * @var list<string>
     */
    public const CATEGORIES = [
        'limpieza',
        'lenceria',
        'alimentos',
        'bebidas',
        'mantenimiento',
        'amenidades',
        'papeleria',
        'otro',
    ];

    /**
     * @var list<string>
     */
    public const UNITS = [
        'unidad',
        'caja',
        'paquete',
        'botella',
        'litro',
        'kilogramo',
        'metro',
        'rollo',
    ];

    protected $fillable = [
        'hotel_id',
        'name',
        'sku',
        'category',
        'unit',
        'min_stock',
        'unit_cost',
        'stock',
        'active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'min_stock' => 'decimal:2',
            'unit_cost' => 'decimal:2',
            'stock' => 'decimal:2',
            'active' => 'boolean',
        ];
    }

    public function movements(): HasMany
    {
        return $this->hasMany(InventoryMovement::class);
    }

    public function isOutOfStock(): bool
    {
        return (float) $this->stock <= 0;
    }

    public function isLowStock(): bool
    {
        return ! $this->isOutOfStock()
            && (float) $this->stock <= (float) $this->min_stock;
    }

    public function inventoryValue(): float
    {
        return round((float) $this->stock * (float) $this->unit_cost, 2);
    }
}
