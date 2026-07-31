<?php

namespace App\Http\Controllers;

use App\Models\Area;
use App\Models\Room;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RoomController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Room::query();

        if ($request->filled('status')) {
            $query->where('active', $request->status);
        }

        $rooms = Room::all();

        return Inertia::render('Rooms/Index', [
            'area' => Area::all(),
            'room' => $rooms,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('Rooms/Create', [
            'areas' => Area::all(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:50',
            'capacity' => 'required|integer|min:1',
            'location' => 'nullable|string|max:100',
            'shape' => 'required|string',
            'area_id' => 'required|exists:areas,id',
        ]);
        Room::create([
            ...$validated,

            'pos_x' => 100,
            'pos_y' => 100,
            'width' => 60,
            'height' => 60,
            'rotation' => 0,
        ]);

        return redirect()->route('rooms.index')->with('success', 'Habitacion sea registrado correctamente.');
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Room $room)
    {
        $room->load('area');

        return Inertia::render('Rooms/Edit', [
            'room' => $room,
            'areas' => Area::all(),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Room $room)
    {
        if ($request->has('settings')) {
            $validated = $request->validate([
                'name' => 'required|string|max:50',
                'capacity' => 'required|integer|min:1',
                'location' => 'nullable|string|max:100',
                'shape' => 'required|string',
                'area_id' => 'required|exists:tenant.areas,id',
            ]);

            $room->update($validated);

            return redirect()->route('rooms.index')->with('success', 'Habitacion sea restaurando correctamente');
        }

        $validated = $request->validate([
            'pos_x' => 'nullable|integer',
            'pos_y' => 'nullable|integer',
            'width' => 'nullable|integer',
            'height' => 'nullable|integer',
            'rotation' => 'nullable|integer',
            'area_id' => 'nullable|exists:tenant.areas,id',
        ]);

        $room->update($validated);

        return back();
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Room $room)
    {
        $room->active = 0;
        $room->save();

        return back()->with('success', 'Habitacion sea desativando correctamente');
    }
}
