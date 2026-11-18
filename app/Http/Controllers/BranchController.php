<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BranchController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        $query = Branch::query();

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                    ->orWhere('description', 'like', "%{$request->search}%")
                    ->orWhere('phone_number', 'like', "%{$request->search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->boolean('status'));
        }

        $branches = $query->latest('id')->get();

        return Inertia::render('Branches/Index', [
            'filters' => $request->only(['search', 'status']),
            'branches' => $branches,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(): Response
    {
        return Inertia::render('Branches/Create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'phone_number' => 'required|string|max:50',
        ]);

        $validated['description'] ??= '';

        Branch::create($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'La sucursal se registró correctamente.']);

        return to_route('branches.index');
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): Response
    {
        $branch = Branch::findOrFail($id);

        return Inertia::render('Branches/Show', compact('branch'));
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id): Response
    {
        $branch = Branch::findOrFail($id);

        return Inertia::render('Branches/Edit', compact('branch'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): RedirectResponse
    {
        $branch = Branch::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'phone_number' => 'required|string|max:50',
        ]);

        $validated['description'] ??= '';

        $branch->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'La sucursal se actualizó correctamente.']);

        return to_route('branches.index');
    }

    /**
     * Deactivate the specified resource (soft delete through the status flag).
     */
    public function destroy(string $id): RedirectResponse
    {
        $branch = Branch::findOrFail($id);

        $branch->update(['status' => false]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'La sucursal se desactivó correctamente.']);

        return to_route('branches.index');
    }

    /**
     * Restore a previously deactivated branch.
     */
    public function restore(Branch $branch): RedirectResponse
    {
        $branch->update(['status' => true]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'La sucursal se restauró correctamente.']);

        return to_route('branches.index');
    }
}
