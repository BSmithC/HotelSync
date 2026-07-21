<?php

namespace App\Http\Controllers;

use App\Models\Client;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ClientController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
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
            $query->where('active', $request->status);
        }

        $clients = Client::all();

        return Inertia::render('Clients/Index', compact('clients'));
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('Clients/Create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $cedula = $request->filled('cedula') ? preg_replace('/[^0-9]/', '', $request->cedula) : null;
        $rnc = $request->filled('rnc') ? preg_replace('/[^0-9]/', '', $request->rnc) : null;

        $request->merge([
            'cedula' => $cedula ?: null,
            'rnc' => $rnc ?: null,
        ]);

        $validated = $request->validate([
            'first_name' => 'required|string',
            'last_name' => 'required|string',
            'cedula' => 'nullable|required_without:rnc|unique:clients,cedula|regex:/^[0-9]{11}$/',
            'rnc' => 'nullable|required_without:cedula|unique:clients,rnc|regex:/^([0-9]{9}|[0-9]{11})$/',
            'address' => 'required|string',
            'phone_number' => 'required|string',
        ]);
        Client::create($validated);

        return redirect()->route('clients.index')->with('success', 'Cliente Registrado Correctamente');
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
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
