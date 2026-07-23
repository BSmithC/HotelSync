<?php

use App\Http\Controllers\BedController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\RoomController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

Route::resource('/clients', ClientController::class);
Route::resource('/rooms', RoomController::class);
Route::resource('/beds', BedController::class);

require __DIR__.'/settings.php';
