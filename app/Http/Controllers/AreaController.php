<?php

namespace App\Http\Controllers;

use App\Models\Area;
use App\Models\Room;
use App\Services\AuditLogger;
use App\Support\AreaType;
use App\Support\CurrentHotel;
use App\Support\Permission;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AreaController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): Response
    {
        $this->authorize(Permission::RoomsView->value);

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
        $this->authorize(Permission::RoomsLayout->value);

        $validated = $this->validateArea($request, creating: true);

        $area = Area::create([
            ...$validated,
            'x' => $validated['x'] ?? 0,
            'y' => $validated['y'] ?? 0,
            'active' => $validated['active'] ?? true,
        ]);

        app(AuditLogger::class)->record(
            module: 'rooms',
            action: 'area_created',
            subject: $area,
            description: "Área {$area->name} creada",
            changes: [
                'type' => $area->type,
                'width' => $area->width,
                'height' => $area->height,
            ],
        );

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
        $this->authorize(Permission::RoomsLayout->value);

        $validated = $this->validateArea($request, creating: false);

        $area->update($validated);

        app(AuditLogger::class)->record(
            module: 'rooms',
            action: 'area_updated',
            subject: $area,
            description: "Área {$area->name} actualizada",
            changes: ['attributes' => array_keys($validated)],
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => 'El área se actualizó correctamente.']);

        return back();
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Area $area): RedirectResponse
    {
        $this->authorize(Permission::RoomsLayout->value);

        if (Room::query()->where('area_id', $area->id)->exists()) {
            throw ValidationException::withMessages([
                'area' => 'No se puede eliminar un área que todavía tiene habitaciones.',
            ]);
        }

        $area->delete();

        app(AuditLogger::class)->record(
            module: 'rooms',
            action: 'area_deleted',
            description: "Área {$area->name} eliminada",
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => 'El área se eliminó correctamente.']);

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    private function validateArea(Request $request, bool $creating): array
    {
        $hotelId = app(CurrentHotel::class)->id();

        return $request->validate([
            'name' => [$creating ? 'required' : 'sometimes', 'string', 'max:255'],
            'width' => [$creating ? 'required' : 'sometimes', 'integer', 'min:100', 'max:5000'],
            'height' => [$creating ? 'required' : 'sometimes', 'integer', 'min:100', 'max:5000'],
            'x' => ['sometimes', 'integer', 'min:0', 'max:20000'],
            'y' => ['sometimes', 'integer', 'min:0', 'max:20000'],
            'type' => ['sometimes', 'string', Rule::in(AreaType::ALL)],
            'color' => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'floor' => ['nullable', 'integer', 'min:0', 'max:200'],
            'building_id' => ['nullable', 'integer', Rule::exists('buildings', 'id')->where('hotel_id', $hotelId)],
            'active' => ['sometimes', 'boolean'],
        ]);
    }
}
