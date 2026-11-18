<?php

namespace App\Http\Controllers;

use App\Models\Bed;
use App\Support\CurrentHotel;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class BedController extends Controller
{
    /**
     * Validation rules for creating a bed.
     *
     * The area must belong to the current hotel.
     *
     * @return array<string, mixed>
     */
    private function rules(): array
    {
        $hotelId = app(CurrentHotel::class)->id();

        return [
            'name' => ['required', 'string', 'max:50'],
            'area_id' => ['required', Rule::exists('areas', 'id')->where('hotel_id', $hotelId)],
            'capacity' => ['required', 'integer', 'min:1'],
            'shape' => ['nullable', 'string', 'max:30'],
        ];
    }

    /**
     * Validation rules for updating a bed (all fields are optional).
     *
     * @return array<string, mixed>
     */
    private function updateRules(): array
    {
        $hotelId = app(CurrentHotel::class)->id();

        return [
            'name' => ['sometimes', 'string', 'max:50'],
            'area_id' => ['sometimes', Rule::exists('areas', 'id')->where('hotel_id', $hotelId)],
            'capacity' => ['sometimes', 'integer', 'min:1'],
            'shape' => ['nullable', 'string', 'max:30'],
            'pos_x' => ['nullable', 'integer'],
            'pos_y' => ['nullable', 'integer'],
            'width' => ['nullable', 'integer'],
            'height' => ['nullable', 'integer'],
            'rotation' => ['nullable', 'integer'],
        ];
    }

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
        $validated = $request->validate($this->rules());

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

        $bed->update($request->validate($this->updateRules()));

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
