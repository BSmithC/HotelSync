<?php

namespace App\Http\Controllers;

use App\Models\Bed;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BedController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): Response
    {
        return Inertia::render('coming-soon', [
            'title' => 'Camas',
            'description' => 'La administración de camas se habilitará junto con el plano de habitaciones.',
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(): Response
    {
        return $this->index();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:50',
            'area_id' => 'required|exists:areas,id',
            'capacity' => 'required|integer|min:1',
            'shape' => 'nullable|string|max:30',
        ]);

        Bed::create([
            ...$validated,
            'shape' => $validated['shape'] ?? 'circle',
            'pos_x' => 0,
            'pos_y' => 0,
            'width' => 40,
            'height' => 40,
            'rotation' => 0,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'La cama se registró correctamente.']);

        return to_route('beds.index');
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): Response
    {
        return $this->index();
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id): Response
    {
        return $this->index();
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): RedirectResponse
    {
        $bed = Bed::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:50',
            'area_id' => 'sometimes|exists:areas,id',
            'capacity' => 'sometimes|integer|min:1',
            'shape' => 'nullable|string|max:30',
            'pos_x' => 'nullable|integer',
            'pos_y' => 'nullable|integer',
            'width' => 'nullable|integer',
            'height' => 'nullable|integer',
            'rotation' => 'nullable|integer',
        ]);

        $bed->update($validated);

        return back();
    }

    /**
     * Deactivate the specified resource.
     */
    public function destroy(string $id): RedirectResponse
    {
        $bed = Bed::findOrFail($id);

        $bed->update(['active' => false]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'La cama se desactivó correctamente.']);

        return back();
    }
}
