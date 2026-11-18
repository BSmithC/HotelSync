<?php

namespace App\Http\Controllers;

use App\Models\Area;
use App\Models\Room;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RoomController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        $areas = Area::orderBy('name')->get();

        $currentArea = $request->filled('area_id')
            ? $areas->firstWhere('id', (int) $request->input('area_id'))
            : $areas->first();

        $currentArea ??= $areas->first();

        $rooms = $currentArea
            ? Room::with('area')
                ->where('area_id', $currentArea->id)
                ->when($request->filled('status'), fn ($query) => $query->where('active', $request->boolean('status')))
                ->orderBy('name')
                ->get()
            : collect();

        return Inertia::render('Rooms/Index', [
            'areas' => $areas,
            'currentArea' => $currentArea,
            'rooms' => $rooms,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(): Response
    {
        return Inertia::render('Rooms/Create', [
            'areas' => Area::orderBy('name')->get(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:50',
            'capacity' => 'required|integer|min:1',
            'shape' => 'required|string|max:30',
            'area_id' => 'required|exists:areas,id',
            'description' => 'nullable|string',
            'price' => 'nullable|numeric|min:0',
            'phone' => 'nullable|string|max:50',
            'status' => 'nullable|string|max:30',
        ]);

        Room::create([
            ...$validated,
            'pos_x' => 100,
            'pos_y' => 100,
            'width' => 60,
            'height' => 60,
            'rotation' => 0,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'La habitación se registró correctamente.']);

        return to_route('rooms.index');
    }

    /**
     * Display the specified resource.
     */
    public function show(Room $room): Response
    {
        $room->load('area');

        return Inertia::render('Rooms/Show', [
            'room' => $room,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Room $room): Response
    {
        $room->load('area');

        return Inertia::render('Rooms/Edit', [
            'room' => $room,
            'areas' => Area::orderBy('name')->get(),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Room $room): RedirectResponse
    {
        if ($request->boolean('settings')) {
            $validated = $request->validate([
                'name' => 'required|string|max:50',
                'capacity' => 'required|integer|min:1',
                'shape' => 'required|string|max:30',
                'area_id' => 'required|exists:areas,id',
                'description' => 'nullable|string',
                'price' => 'nullable|numeric|min:0',
                'phone' => 'nullable|string|max:50',
                'status' => 'nullable|string|max:30',
            ]);

            $room->update($validated);

            Inertia::flash('toast', ['type' => 'success', 'message' => 'La habitación se actualizó correctamente.']);

            return to_route('rooms.index');
        }

        $validated = $request->validate([
            'pos_x' => 'nullable|integer',
            'pos_y' => 'nullable|integer',
            'width' => 'nullable|integer',
            'height' => 'nullable|integer',
            'rotation' => 'nullable|integer',
            'area_id' => 'nullable|exists:areas,id',
        ]);

        $room->update($validated);

        return back();
    }

    /**
     * Deactivate the specified resource.
     */
    public function destroy(Room $room): RedirectResponse
    {
        $room->update(['active' => false]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'La habitación se desactivó correctamente.']);

        return to_route('rooms.index');
    }
}
