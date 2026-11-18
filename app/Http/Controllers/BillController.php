<?php

namespace App\Http\Controllers;

use App\Models\Bill;
use App\Models\Client;
use App\Models\Reservation;
use App\Services\AuditLogger;
use App\Support\CurrentHotel;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class BillController extends Controller
{
    /**
     * Bill statuses accepted by the list filter.
     *
     * @var list<string>
     */
    private const STATUSES = ['Pendiente', 'Pagada', 'Anulada'];

    /**
     * Validation rules shared by store and update.
     *
     * The client and the reservation must belong to the current hotel, and
     * the invoice number is unique per hotel.
     *
     * @return array<string, mixed>
     */
    private function rules(?Bill $bill = null): array
    {
        $hotelId = app(CurrentHotel::class)->id();

        return [
            'client_id' => ['required', Rule::exists('clients', 'id')->where('hotel_id', $hotelId)],
            'reservation_id' => ['nullable', Rule::exists('reservations', 'id')->where('hotel_id', $hotelId)],
            'number' => [
                'required',
                'string',
                'max:50',
                Rule::unique('bills', 'number')->where('hotel_id', $hotelId)->ignore($bill?->id),
            ],
            'issued_at' => ['required', 'date'],
            'subtotal' => ['required', 'numeric', 'min:0'],
            'tax' => ['nullable', 'numeric', 'min:0'],
            'status' => ['required', 'string', 'max:50'],
            'notes' => ['nullable', 'string'],
        ];
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        $query = Bill::with(['client', 'reservation']);

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('number', 'like', "%{$request->search}%")
                    ->orWhere('status', 'like', "%{$request->search}%")
                    ->orWhereHas('client', function ($client) use ($request) {
                        $client->where('first_name', 'like', "%{$request->search}%")
                            ->orWhere('last_name', 'like', "%{$request->search}%");
                    });
            });
        }

        if ($request->filled('status')) {
            $query->where('active', $request->boolean('status'));
        }

        $state = $request->string('state')->toString();

        if (in_array($state, self::STATUSES, true)) {
            $query->where('status', $state);
        }

        return Inertia::render('Bills/Index', [
            'bills' => $query->latest('id')->paginate(10)->withQueryString(),
            'filters' => $request->only(['search', 'status', 'state']),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('Bills/Create', [
            'clients' => Client::orderBy('first_name')->get(['id', 'first_name', 'last_name']),
            'reservations' => Reservation::with('client')->latest('id')->get(['id', 'client_id', 'reserved_at']),
            'defaults' => [
                'client_id' => $request->integer('client_id') ?: null,
                'reservation_id' => $request->integer('reservation_id') ?: null,
            ],
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request, AuditLogger $audit): RedirectResponse
    {
        $validated = $request->validate($this->rules());

        $validated['tax'] ??= 0;
        $validated['total'] = round($validated['subtotal'] + $validated['tax'], 2);

        $bill = Bill::create($validated);

        $audit->record(
            module: 'billing',
            action: 'bill_created',
            subject: $bill,
            description: "Factura {$bill->number} creada",
            changes: [
                'number' => $bill->number,
                'total' => (float) $bill->total,
                'status' => $bill->status,
            ],
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => 'La factura se registró correctamente.']);

        return to_route('bills.index');
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): Response
    {
        $bill = Bill::with(['client', 'reservation', 'details'])->findOrFail($id);

        return Inertia::render('Bills/Show', compact('bill'));
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id): Response
    {
        $bill = Bill::findOrFail($id);

        return Inertia::render('Bills/Edit', [
            'bill' => $bill,
            'clients' => Client::orderBy('first_name')->get(['id', 'first_name', 'last_name']),
            'reservations' => Reservation::with('client')->latest('id')->get(['id', 'client_id', 'reserved_at']),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id, AuditLogger $audit): RedirectResponse
    {
        $bill = Bill::findOrFail($id);

        $validated = $request->validate($this->rules($bill));

        $validated['tax'] ??= 0;
        $validated['total'] = round($validated['subtotal'] + $validated['tax'], 2);

        $before = $bill->only(['number', 'subtotal', 'tax', 'total', 'status', 'active']);

        $bill->update($validated);

        $audit->record(
            module: 'billing',
            action: 'bill_updated',
            subject: $bill,
            description: "Factura {$bill->number} actualizada",
            changes: [
                'before' => $before,
                'after' => $bill->only(['number', 'subtotal', 'tax', 'total', 'status', 'active']),
            ],
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => 'La factura se actualizó correctamente.']);

        return to_route('bills.index');
    }

    /**
     * Deactivate the specified resource.
     */
    public function destroy(string $id, AuditLogger $audit): RedirectResponse
    {
        $bill = Bill::findOrFail($id);

        $bill->update(['active' => false]);

        $audit->record(
            module: 'billing',
            action: 'bill_deactivated',
            subject: $bill,
            description: "Factura {$bill->number} desactivada",
            changes: ['active' => false, 'total' => (float) $bill->total],
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => 'La factura se desactivó correctamente.']);

        return to_route('bills.index');
    }

    /**
     * Restore a previously deactivated bill.
     */
    public function restore(Bill $bill, AuditLogger $audit): RedirectResponse
    {
        $bill->update(['active' => true]);

        $audit->record(
            module: 'billing',
            action: 'bill_restored',
            subject: $bill,
            description: "Factura {$bill->number} restaurada",
            changes: ['active' => true, 'total' => (float) $bill->total],
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => 'La factura se restauró correctamente.']);

        return to_route('bills.index');
    }
}
