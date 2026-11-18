<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Support\CurrentHotel;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ClientController extends Controller
{
    /**
     * Validation rules shared by store and update.
     *
     * Cédula and RNC are unique per hotel, not globally.
     *
     * @return array<string, mixed>
     */
    private function rules(?Client $client = null): array
    {
        $hotelId = app(CurrentHotel::class)->id();

        return [
            'first_name' => ['required', 'string'],
            'last_name' => ['required', 'string'],
            'cedula' => [
                'nullable',
                'required_without:rnc',
                'regex:/^[0-9]{11}$/',
                Rule::unique('clients', 'cedula')->where('hotel_id', $hotelId)->ignore($client?->id),
            ],
            'rnc' => [
                'nullable',
                'required_without:cedula',
                'regex:/^([0-9]{9}|[0-9]{11})$/',
                Rule::unique('clients', 'rnc')->where('hotel_id', $hotelId)->ignore($client?->id),
            ],
            'address' => ['required', 'string'],
            'phone_number' => ['required', 'string'],
        ];
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        $query = Client::query();

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('first_name', 'like', "%{$request->search}%")
                    ->orWhere('last_name', 'like', "%{$request->search}%")
                    ->orWhere('cedula', 'like', "%{$request->search}%")
                    ->orWhere('rnc', 'like', "%{$request->search}%")
                    ->orWhere('address', 'like', "%{$request->search}%")
                    ->orWhere('phone_number', 'like', "%{$request->search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('active', $request->boolean('status'));
        }

        $clients = $query->latest('id')->get();

        return Inertia::render('Clients/Index', [
            'clients' => $clients,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(): Response
    {
        return Inertia::render('Clients/Create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $cedula = $request->filled('cedula') ? preg_replace('/[^0-9]/', '', $request->cedula) : null;
        $rnc = $request->filled('rnc') ? preg_replace('/[^0-9]/', '', $request->rnc) : null;

        $request->merge([
            'cedula' => $cedula ?: null,
            'rnc' => $rnc ?: null,
        ]);

        $validated = $request->validate($this->rules());

        Client::create($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Cliente registrado correctamente.']);

        return to_route('clients.index');
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): Response
    {
        $client = Client::findOrFail($id);

        return Inertia::render('Clients/Show', compact('client'));
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id): Response
    {
        $client = Client::findOrFail($id);

        return Inertia::render('Clients/Edit', compact('client'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): RedirectResponse
    {
        $client = Client::findOrFail($id);

        if ($request->has('cedula') && ! empty($request->cedula)) {
            $request->merge(['cedula' => preg_replace('/[^0-9]/', '', $request->cedula)]);
        }
        if ($request->has('rnc') && ! empty($request->rnc)) {
            $request->merge(['rnc' => preg_replace('/[^0-9]/', '', $request->rnc)]);
        }

        $cedula = $request->filled('cedula') ? preg_replace('/[^0-9]/', '', $request->cedula) : null;
        $rnc = $request->filled('rnc') ? preg_replace('/[^0-9]/', '', $request->rnc) : null;

        $request->merge([
            'cedula' => $cedula ?: null,
            'rnc' => $rnc ?: null,
        ]);

        $validated = $request->validate($this->rules($client));

        $client->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Cliente actualizado correctamente.']);

        return to_route('clients.index');
    }

    /**
     * Deactivate the specified resource (soft delete through the active flag).
     */
    public function destroy(string $id): RedirectResponse
    {
        $client = Client::findOrFail($id);

        $client->update(['active' => false]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Cliente desactivado correctamente.']);

        return to_route('clients.index');
    }

    /**
     * Restore a previously deactivated client.
     */
    public function restore(Client $client): RedirectResponse
    {
        $client->update(['active' => true]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Cliente restaurado correctamente.']);

        return to_route('clients.index');
    }
}
