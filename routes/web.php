<?php

use App\Http\Controllers\AreaController;
use App\Http\Controllers\BedController;
use App\Http\Controllers\BillController;
use App\Http\Controllers\BranchController;
use App\Http\Controllers\BuildingController;
use App\Http\Controllers\CalendarController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\HotelSwitchController;
use App\Http\Controllers\ReservationController;
use App\Http\Controllers\RoomController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    // Cambio de hotel activo para usuarios con acceso a varios hoteles.
    Route::post('hotels/{hotel}/switch', HotelSwitchController::class)->name('hotels.switch');

    // Acciones explícitas de restauración (no dependen de enviar "active" en un update).
    Route::patch('clients/{client}/restore', [ClientController::class, 'restore'])->name('clients.restore');
    Route::patch('branches/{branch}/restore', [BranchController::class, 'restore'])->name('branches.restore');
    Route::patch('reservations/{reservation}/restore', [ReservationController::class, 'restore'])->name('reservations.restore');
    Route::patch('calendars/{calendar}/restore', [CalendarController::class, 'restore'])->name('calendars.restore');
    Route::patch('buildings/{building}/restore', [BuildingController::class, 'restore'])->name('buildings.restore');
    Route::patch('bills/{bill}/restore', [BillController::class, 'restore'])->name('bills.restore');

    // Las áreas son necesarias para crear habitaciones y no tienen CRUD completo todavía.
    Route::post('areas', [AreaController::class, 'store'])->name('areas.store');

    Route::resources([
        'clients' => ClientController::class,
        'rooms' => RoomController::class,
        'beds' => BedController::class,
        'reservations' => ReservationController::class,
        'calendars' => CalendarController::class,
        'buildings' => BuildingController::class,
        'branches' => BranchController::class,
        'bills' => BillController::class,
    ]);
});

require __DIR__.'/settings.php';
