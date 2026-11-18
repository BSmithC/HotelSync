<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Reservation;
use App\Models\Room;
use App\Support\CurrentHotel;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ReservationController extends Controller
{
    /**
     * Reservation statuses accepted by the list filter.
     *
     * @var list<string>
     */
    private const STATUSES = ['Pendiente', 'Confirmada', 'En curso', 'Finalizada', 'Cancelada'];

    /**
     * Validation rules shared by store and update.
     *
     * The client and the room must belong to the current hotel.
     *
     * @return array<string, mixed>
     */
    private function rules(): array
    {
        $hotelId = app(CurrentHotel::class)->id();

        return [
            'client_id' => ['required', Rule::exists('clients', 'id')->where('hotel_id', $hotelId)],
            'room_id' => ['required', Rule::exists('rooms', 'id')->where('hotel_id', $hotelId)],
            'reserved_at' => ['required', 'date'],
            'finished_at' => ['nullable', 'date', 'after_or_equal:reserved_at'],
            'guests' => ['required', 'integer', 'min:1'],
            'status' => ['required', 'string', 'max:50'],
            'notes' => ['nullable', 'string'],
        ];
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        $query = Reservation::with(['client', 'room']);

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('status', 'like', "%{$request->search}%")
                    ->orWhereHas('client', function ($client) use ($request) {
                        $client->where('first_name', 'like', "%{$request->search}%")
                            ->orWhere('last_name', 'like', "%{$request->search}%");
                    })
                    ->orWhereHas('room', fn ($room) => $room->where('name', 'like', "%{$request->search}%"));
            });
        }

        if ($request->filled('status')) {
            $query->where('active', $request->boolean('status'));
        }

        $state = $request->string('state')->toString();

        if (in_array($state, self::STATUSES, true)) {
            $query->where('status', $state);
        }

        return Inertia::render('Reservations/Index', [
            'reservations' => $query->latest('id')->paginate(10)->withQueryString(),
            'filters' => $request->only(['search', 'status', 'state']),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(): Response
    {
        return Inertia::render('Reservations/Create', [
            'clients' => Client::orderBy('first_name')->get(['id', 'first_name', 'last_name']),
            'rooms' => Room::orderBy('name')->get(['id', 'name']),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate($this->rules());

        Reservation::create([
            ...$validated,
            'user_id' => $request->user()->id,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'La reservación se registró correctamente.']);

        return to_route('reservations.index');
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): Response
    {
        $reservation = Reservation::with(['client', 'room', 'user'])->findOrFail($id);

        return Inertia::render('Reservations/Show', compact('reservation'));
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id): Response
    {
        $reservation = Reservation::findOrFail($id);

        return Inertia::render('Reservations/Edit', [
            'reservation' => $reservation,
            'clients' => Client::orderBy('first_name')->get(['id', 'first_name', 'last_name']),
            'rooms' => Room::orderBy('name')->get(['id', 'name']),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): RedirectResponse
    {
        $reservation = Reservation::findOrFail($id);

        $reservation->update($request->validate($this->rules()));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'La reservación se actualizó correctamente.']);

        return to_route('reservations.index');
    }

    /**
     * Deactivate the specified resource.
     */
    public function destroy(string $id): RedirectResponse
    {
        $reservation = Reservation::findOrFail($id);

        $reservation->update(['active' => false]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'La reservación se desactivó correctamente.']);

        return to_route('reservations.index');
    }

    /**
     * Restore a previously deactivated reservation.
     */
    public function restore(Reservation $reservation): RedirectResponse
    {
        $reservation->update(['active' => true]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'La reservación se restauró correctamente.']);

        return to_route('reservations.index');
    }
}
