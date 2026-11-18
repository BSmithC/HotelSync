<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BuildingController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): Response
    {
        return $this->comingSoon();
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(): Response
    {
        return $this->comingSoon();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        return back();
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): Response
    {
        return $this->comingSoon();
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id): Response
    {
        return $this->comingSoon();
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): RedirectResponse
    {
        return back();
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): RedirectResponse
    {
        return back();
    }

    private function comingSoon(): Response
    {
        return Inertia::render('coming-soon', [
            'title' => 'Edificios',
            'description' => 'La administración de edificios y sucursales se habilitará en el módulo de inventario hotelero.',
        ]);
    }
}
