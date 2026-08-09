<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

class Client extends Model
{
    protected $fillable = [
        'first_name',
        'last_name',
        'cedula',
        'rnc',
        'address',
        'phone_number',
        'active',
    ];
    public function rooms()
    {
        return $this->hasMany(Room::class);
    }
    public function reservation()
    {
        return $this->hasMany(Reservation::class);
    }
}
