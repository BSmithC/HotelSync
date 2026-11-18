<?php

namespace App\Http\Controllers;

use App\Models\Calendar;
use App\Models\Reservation;
use App\Models\Room;
use App\Support\CurrentHotel;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CalendarController extends Controller
{
    /**
     * Validation rules shared by store and update.
     *
     * The room and the reservation must belong to the current hotel.
     *
     * @return array<string, mixed>
     */
    private function rules(): array
    {
        $hotelId = app(CurrentHotel::class)->id();

        return [
            'title' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'max:50'],
            'room_id' => ['nullable', Rule::exists('rooms', 'id')->where('hotel_id', $hotelId)],
            'reservation_id' => ['nullable', Rule::exists('reservations', 'id')->where('hotel_id', $hotelId)],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'description' => ['nullable', 'string'],
        ];
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        $query = Calendar::with(['room', 'reservation.client']);

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('title', 'like', "%{$request->search}%")
                    ->orWhere('type', 'like', "%{$request->search}%")
                    ->orWhere('description', 'like', "%{$request->search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('active', $request->boolean('status'));
        }

        return Inertia::render('Calendar/Index', [
            'events' => $query->orderBy('starts_at')->get(),
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(): Response
    {
        return Inertia::render('Calendar/Create', [
            'rooms' => Room::orderBy('name')->get(['id', 'name']),
            'reservations' => Reservation::with('client')->latest('id')->get(['id', 'client_id', 'room_id', 'reserved_at']),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate($this->rules());

        Calendar::create($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'El evento se registró correctamente.']);

        return to_route('calendars.index');
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): Response
    {
        $event = Calendar::with(['room', 'reservation.client'])->findOrFail($id);

        return Inertia::render('Calendar/Show', compact('event'));
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id): Response
    {
        $event = Calendar::findOrFail($id);

        return Inertia::render('Calendar/Edit', [
            'event' => $event,
            'rooms' => Room::orderBy('name')->get(['id', 'name']),
            'reservations' => Reservation::with('client')->latest('id')->get(['id', 'client_id', 'room_id', 'reserved_at']),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): RedirectResponse
    {
        $event = Calendar::findOrFail($id);

        $event->update($request->validate($this->rules()));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'El evento se actualizó correctamente.']);

        return to_route('calendars.index');
    }

    /**
     * Deactivate the specified resource.
     */
    public function destroy(string $id): RedirectResponse
    {
        $event = Calendar::findOrFail($id);

        $event->update(['active' => false]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'El evento se desactivó correctamente.']);

        return to_route('calendars.index');
    }

    /**
     * Restore a previously deactivated event.
     */
    public function restore(Calendar $calendar): RedirectResponse
    {
        $calendar->update(['active' => true]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'El evento se restauró correctamente.']);

        return to_route('calendars.index');
    }
}
