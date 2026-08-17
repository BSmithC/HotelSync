<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BranchController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Branch::query();

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                    ->orWhere('description', 'like', "%{$request->search}")
                    ->orWhere('phone_number', 'like', "%{$request->search}");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $branches = Branch::all();

        return Inertia::render('Branches/Index', [
            'filters' => $request->only(['search', 'status']),
            'branches' => $branches,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('Branches/Create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'description' => 'nullable|string',
            'phone_number' => 'required|string',
            'status' => true,
        ]);

        Branch::create($validated);

        return redirect()->route('branches.index')->with('success', 'La surcusal sea registrado correctamente');
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $branch = Branch::findOrFail($id);
        return Inertia::render('Branches/Show',compact('branch'));
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        $branch = Branch::findOrFail($id);
        return Inertia::render('Branches/Edit', compact('branch'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $branch = Branch::findOrFail($id);

        if ($request->has('status')) {
            $branch->status = 1;
            $branch->save();

            return redirect()->route('branches.index')->with('success', 'Surcusal restaurando correctamente');
        }

        $validated = $request->validate([
            'name' => 'required|string',
            'description' => 'nullable|string',
            'phone_number' => 'required|string',
        ]);

        $branch->update($validated);

        return redirect()->route('branches.index')->with('success', 'Surcusal actualizando correctamente');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $branch = Branch::findOrFail($id);

        $branch->status = 0;
        $branch->save();

        return redirect()->route('branches.index')->with('success', 'Surcusal desativado correctamente');
    }
}
