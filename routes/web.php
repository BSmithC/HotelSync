<?php

use App\Http\Controllers\BedController;
use App\Http\Controllers\BillController;
use App\Http\Controllers\BranchController;
use App\Http\Controllers\BuildingController;
use App\Http\Controllers\CalendarController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\ReservationController;
use App\Http\Controllers\RoomController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

Route::resource('/clients', ClientController::class);
Route::resource('/rooms', RoomController::class);
Route::resource('/beds', BedController::class);
Route::resource('/reservations', ReservationController::class);
Route::resource('/calendars', CalendarController::class);
Route::resource('/buildings', BuildingController::class);
Route::resource('/branches', BranchController::class);
Route::resource('/bills', BillController::class);

require __DIR__.'/settings.php';
