<?php

use App\Http\Controllers\Settings\HotelOperationsController;
use App\Http\Controllers\Settings\HotelPreferencesController;
use App\Http\Controllers\Settings\HotelProfileController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\SecurityController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::redirect('settings', '/settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/security', [SecurityController::class, 'edit'])
        ->name('security.edit');

    Route::put('settings/password', [SecurityController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('user-password.update');

    Route::inertia('settings/appearance', 'settings/appearance')->name('appearance.edit');

    // Configuración del hotel activo. El hotel siempre se resuelve en el
    // servidor: ninguna de estas rutas acepta un hotel_id del frontend.
    Route::prefix('settings/hotel')->name('hotel-settings.')->group(function () {
        Route::get('general', [HotelProfileController::class, 'edit'])->name('general.edit');
        Route::patch('general', [HotelProfileController::class, 'update'])->name('general.update');

        Route::get('regional', [HotelPreferencesController::class, 'regional'])->name('regional.edit');
        Route::patch('regional', [HotelPreferencesController::class, 'updateRegional'])->name('regional.update');

        Route::get('reservations', [HotelPreferencesController::class, 'reservations'])->name('reservations.edit');
        Route::patch('reservations', [HotelPreferencesController::class, 'updateReservations'])->name('reservations.update');

        Route::get('finance', [HotelPreferencesController::class, 'finance'])->name('finance.edit');
        Route::patch('finance', [HotelPreferencesController::class, 'updateFinance'])->name('finance.update');

        Route::get('rooms', [HotelOperationsController::class, 'edit'])->name('rooms.edit');

        Route::patch('{section}/reset', [HotelPreferencesController::class, 'reset'])
            ->whereIn('section', ['regional', 'reservations', 'finance'])
            ->name('reset');
    });
});
