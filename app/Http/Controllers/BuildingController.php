<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Building;
use App\Support\CurrentHotel;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class BuildingController extends Controller
{
    /**
     * Validation rules shared by store and update.
     *
     * The branch must belong to the current hotel.
     *
     * @return array<string, mixed>
     */
    private function rules(): array
    {
        $hotelId = app(CurrentHotel::class)->id();

        return [
            'name' => ['required', 'string', 'max:255'],
            'branch_id' => ['nullable', Rule::exists('branches', 'id')->where('hotel_id', $hotelId)],
            'address' => ['nullable', 'string', 'max:255'],
            'floors' => ['required', 'integer', 'min:1'],
            'description' => ['nullable', 'string'],
        ];
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        $query = Building::with('branch');

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                    ->orWhere('address', 'like', "%{$request->search}%")
                    ->orWhere('description', 'like', "%{$request->search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('active', $request->boolean('status'));
        }

        return Inertia::render('Buildings/Index', [
            'buildings' => $query->latest('id')->get(),
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(): Response
    {
        return Inertia::render('Buildings/Create', [
            'branches' => Branch::orderBy('name')->get(['id', 'name']),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate($this->rules());

        Building::create($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'El edificio se registró correctamente.']);

        return to_route('buildings.index');
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): Response
    {
        $building = Building::with('branch')->findOrFail($id);

        return Inertia::render('Buildings/Show', compact('building'));
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id): Response
    {
        $building = Building::findOrFail($id);

        return Inertia::render('Buildings/Edit', [
            'building' => $building,
            'branches' => Branch::orderBy('name')->get(['id', 'name']),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): RedirectResponse
    {
        $building = Building::findOrFail($id);

        $building->update($request->validate($this->rules()));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'El edificio se actualizó correctamente.']);

        return to_route('buildings.index');
    }

    /**
     * Deactivate the specified resource.
     */
    public function destroy(string $id): RedirectResponse
    {
        $building = Building::findOrFail($id);

        $building->update(['active' => false]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'El edificio se desactivó correctamente.']);

        return to_route('buildings.index');
    }

    /**
     * Restore a previously deactivated building.
     */
    public function restore(Building $building): RedirectResponse
    {
        $building->update(['active' => true]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'El edificio se restauró correctamente.']);

        return to_route('buildings.index');
    }
}
