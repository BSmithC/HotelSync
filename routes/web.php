<?php

use App\Http\Controllers\AreaController;
use App\Http\Controllers\BedController;
use App\Http\Controllers\BillController;
use App\Http\Controllers\BranchController;
use App\Http\Controllers\BuildingController;
use App\Http\Controllers\CalendarController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\FinanceController;
use App\Http\Controllers\HotelSwitchController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\ReceptionController;
use App\Http\Controllers\ReservationController;
use App\Http\Controllers\RoomController;
use App\Http\Controllers\ServicesController;
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

    // Centro de operaciones de recepción.
    Route::prefix('reception')->name('reception.')->group(function () {
        Route::get('/', [ReceptionController::class, 'index'])->name('index');
        Route::get('guests/{client}', [ReceptionController::class, 'guest'])->name('guests.show');
        Route::post('reservations/{reservation}/check-in', [ReceptionController::class, 'checkIn'])->name('check-in');
        Route::post('reservations/{reservation}/check-out', [ReceptionController::class, 'checkOut'])->name('check-out');
        Route::patch('reservations/{reservation}/room', [ReceptionController::class, 'changeRoom'])->name('room');
        Route::post('incidents', [ReceptionController::class, 'storeIncident'])->name('incidents.store');
        Route::patch('incidents/{incident}', [ReceptionController::class, 'updateIncident'])->name('incidents.update');
        Route::patch('rooms/{room}/status', [ReceptionController::class, 'updateRoomStatus'])->name('rooms.status');
    });

    // Centro de operaciones financieras: cobros, gastos y libro de movimientos.
    Route::prefix('finance')->name('finance.')->group(function () {
        Route::get('/', [FinanceController::class, 'index'])->name('index');
        Route::get('export', [FinanceController::class, 'export'])->name('export');
        Route::post('payments', [FinanceController::class, 'storePayment'])->name('payments.store');
        Route::post('payments/{payment}/void', [FinanceController::class, 'voidPayment'])->name('payments.void');
        Route::post('expenses', [FinanceController::class, 'storeExpense'])->name('expenses.store');
        Route::post('expenses/{expense}/void', [FinanceController::class, 'voidExpense'])->name('expenses.void');
        Route::post('bills/{bill}/void', [FinanceController::class, 'voidBill'])->name('bills.void');
    });

    // Centro de inventario: catálogo, movimientos y ajustes con reversos.
    Route::prefix('inventory')->name('inventory.')->group(function () {
        Route::get('/', [InventoryController::class, 'index'])->name('index');
        Route::post('items', [InventoryController::class, 'storeItem'])->name('items.store');
        Route::patch('items/{item}', [InventoryController::class, 'updateItem'])->name('items.update');
        Route::post('items/{item}/movements', [InventoryController::class, 'storeMovement'])->name('movements.store');
        Route::post('movements/{movement}/void', [InventoryController::class, 'voidMovement'])->name('movements.void');
    });

    // Centro de servicios: catálogo, solicitudes y facturación de líneas.
    Route::prefix('services')->name('services.')->group(function () {
        Route::get('/', [ServicesController::class, 'index'])->name('index');
        Route::post('catalog', [ServicesController::class, 'storeService'])->name('catalog.store');
        Route::patch('catalog/{service}', [ServicesController::class, 'updateService'])->name('catalog.update');
        Route::post('requests', [ServicesController::class, 'storeRequest'])->name('requests.store');
        Route::post('requests/{serviceRequest}/status', [ServicesController::class, 'changeRequestStatus'])->name('requests.status');
        Route::post('requests/{serviceRequest}/void', [ServicesController::class, 'voidRequest'])->name('requests.void');
        Route::post('requests/{serviceRequest}/bill', [ServicesController::class, 'billRequest'])->name('requests.bill');
    });

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
