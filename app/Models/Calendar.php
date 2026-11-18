<?php

namespace App\Models;

use App\Models\Concerns\BelongsToHotel;
use Illuminate\Database\Eloquent\Model;

class Calendar extends Model
{
    use BelongsToHotel;

    /**
     * The migration creates the singular "calendar" table.
     *
     * @var string
     */
    protected $table = 'calendar';

    protected $fillable = [
        'hotel_id',
    ];
}
