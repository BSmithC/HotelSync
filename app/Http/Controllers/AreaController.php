<?php

namespace App\Http\Controllers;

use App\Models\Area;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AreaController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): Response
    {
        return Inertia::render('coming-soon', [
            'title' => 'Áreas',
            'description' => 'La administración de áreas se habilitará con el plano hotelero completo.',
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
            'name' => 'required|string|max:255',
            'width' => 'required|integer|min:100',
            'height' => 'required|integer|min:100',
            'x' => 'nullable|integer|min:0',
            'y' => 'nullable|integer|min:0',
        ]);

        Area::create([
            ...$validated,
            'x' => $validated['x'] ?? 0,
            'y' => $validated['y'] ?? 0,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'El área se registró correctamente.']);

        return back();
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
    public function update(Request $request, Area $area): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'x' => 'sometimes|integer|min:0',
            'y' => 'sometimes|integer|min:0',
            'width' => 'sometimes|integer|min:100',
            'height' => 'sometimes|integer|min:100',
        ]);

        $area->update($validated);

        return back();
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): RedirectResponse
    {
        return back();
    }
}
