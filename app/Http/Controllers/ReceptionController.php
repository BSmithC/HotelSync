<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Incident;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\RoomStatusLog;
use App\Services\ReceptionService;
use App\Support\CurrentHotel;
use App\Support\Permission;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ReceptionController extends Controller
{
    /**
     * @var list<string>
     */
    private const ACTIVE_ARRIVAL_STATUSES = ['Pendiente', 'Confirmada', 'En curso'];

    /**
     * Reception operations center: arrivals, departures, in-house guests,
     * room state and incidents, all scoped to the current hotel.
     */
    public function index(Request $request): Response
    {
        $this->authorize(Permission::ReceptionView->value);

        $hotel = app(CurrentHotel::class)->model();
        $timezone = $hotel?->timezone ?? config('app.timezone');

        $now = CarbonImmutable::now($timezone);
        $day = $this->resolveDay($request->input('date'), $timezone, $now);
        $dayStartUtc = $day->copy()->utc();
        $dayEndUtc = $day->copy()->endOfDay()->utc();
        $todayStartUtc = $now->copy()->startOfDay()->utc();

        $search = trim((string) $request->input('search', ''));
        $roomState = (string) $request->input('state', '');
        $incidentStatus = (string) $request->input('incident_status', '');

        $arrivals = $this->arrivalQuery($dayStartUtc, $dayEndUtc, $search)
            ->orderBy('reserved_at')
            ->paginate(8, ['*'], 'arrivals_page')
            ->withQueryString();

        $departures = $this->departureQuery($dayEndUtc, $search)
            ->orderBy('finished_at')
            ->paginate(8, ['*'], 'departures_page')
            ->withQueryString();

        $inHouse = Reservation::query()
            ->with($this->reservationRelations())
            ->where('active', true)
            ->where('status', 'En curso')
            ->when($search !== '', fn (Builder $query) => $this->applyReservationSearch($query, $search))
            ->orderByDesc('checked_in_at')
            ->paginate(8, ['*'], 'in_house_page')
            ->withQueryString();

        $rooms = Room::query()
            ->where('active', true)
            ->with([
                'area:id,name',
                'currentReservation:id,client_id,room_id,reserved_at,finished_at,checked_in_at,guests',
                'currentReservation.client:id,first_name,last_name',
            ])
            ->when($search !== '', fn (Builder $query) => $query->where('name', 'like', "%{$search}%"))
            ->when(
                in_array($roomState, RoomStatusLog::STATUSES, true),
                fn (Builder $query) => $query->where('status', $roomState),
            )
            ->orderBy('name')
            ->paginate(12, ['*'], 'rooms_page')
            ->withQueryString();

        $incidents = Incident::query()
            ->with([
                'room:id,name',
                'reservation:id,client_id,room_id,status',
                'reservation.client:id,first_name,last_name',
                'reportedBy:id,name',
                'resolvedBy:id,name',
            ])
            ->when(
                in_array($incidentStatus, Incident::STATUSES, true),
                fn (Builder $query) => $query->where('status', $incidentStatus),
            )
            ->when($search !== '', function (Builder $query) use ($search): void {
                $query->where(function (Builder $query) use ($search): void {
                    $query->where('title', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhereHas('room', fn (Builder $room) => $room->where('name', 'like', "%{$search}%"));
                });
            })
            ->orderByRaw("case when status = 'abierta' then 0 when status = 'en_proceso' then 1 else 2 end")
            ->orderByDesc('id')
            ->paginate(8, ['*'], 'incidents_page')
            ->withQueryString();

        $roomCounts = Room::query()
            ->where('active', true)
            ->selectRaw('status, count(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status')
            ->mapWithKeys(fn (int|string $count, string $status) => [
                strtolower($status) => (int) $count,
            ]);

        return Inertia::render('Reception/Index', [
            'timezone' => $timezone,
            'currency' => $hotel?->currency ?? 'DOP',
            'day' => $day->toDateString(),
            'isToday' => $day->isSameDay($now),
            'kpis' => [
                'arrivals' => $this->arrivalQuery($dayStartUtc, $dayEndUtc, '')->count(),
                'pendingArrivals' => $this->arrivalQuery($dayStartUtc, $dayEndUtc, '')
                    ->whereNull('checked_in_at')
                    ->count(),
                'departures' => $this->departureQuery($dayEndUtc, '')->count(),
                'overdueDepartures' => Reservation::query()
                    ->where('active', true)
                    ->where('status', 'En curso')
                    ->whereNotNull('finished_at')
                    ->where('finished_at', '<', $todayStartUtc)
                    ->count(),
                'inHouse' => Reservation::query()
                    ->where('active', true)
                    ->where('status', 'En curso')
                    ->count(),
                'availableRooms' => (int) ($roomCounts['disponible'] ?? 0),
                'occupiedRooms' => (int) ($roomCounts['ocupada'] ?? 0),
                'openIncidents' => Incident::query()
                    ->whereIn('status', ['abierta', 'en_proceso'])
                    ->count(),
            ],
            'roomCounts' => [
                'disponible' => (int) ($roomCounts['disponible'] ?? 0),
                'ocupada' => (int) ($roomCounts['ocupada'] ?? 0),
                'reservada' => (int) ($roomCounts['reservada'] ?? 0),
                'mantenimiento' => (int) ($roomCounts['mantenimiento'] ?? 0),
            ],
            'arrivals' => $arrivals,
            'departures' => $departures,
            'inHouse' => $inHouse,
            'rooms' => $rooms,
            'roomsForAssignment' => Room::query()
                ->where('active', true)
                ->where('status', '!=', 'mantenimiento')
                ->orderBy('name')
                ->get(['id', 'name', 'status']),
            'roomsForIncidents' => Room::query()
                ->where('active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'status']),
            'inHouseOptions' => Reservation::query()
                ->where('active', true)
                ->where('status', 'En curso')
                ->with('client:id,first_name,last_name')
                ->orderBy('id')
                ->get(['id', 'client_id', 'room_id']),
            'incidents' => $incidents,
            'quickSearch' => $search === '' ? null : [
                'clients' => Client::query()
                    ->where(fn (Builder $query) => $query
                        ->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('cedula', 'like', "%{$search}%")
                        ->orWhere('phone_number', 'like', "%{$search}%"))
                    ->orderBy('first_name')
                    ->limit(5)
                    ->get(['id', 'first_name', 'last_name', 'phone_number', 'cedula']),
                'reservations' => Reservation::query()
                    ->with(['client:id,first_name,last_name', 'room:id,name'])
                    ->where('active', true)
                    ->when(is_numeric($search), fn (Builder $query) => $query->whereKey((int) $search))
                    ->when(! is_numeric($search), fn (Builder $query) => $this->applyReservationSearch($query, $search))
                    ->latest('id')
                    ->limit(5)
                    ->get(['id', 'client_id', 'room_id', 'status', 'reserved_at', 'finished_at', 'checked_in_at']),
            ],
            'filters' => [
                'search' => $search,
                'date' => $day->toDateString(),
                'state' => $roomState,
                'incident_status' => $incidentStatus,
            ],
            'options' => [
                'roomStatuses' => RoomStatusLog::STATUSES,
                'incidentTypes' => Incident::TYPES,
                'incidentSeverities' => Incident::SEVERITIES,
                'incidentStatuses' => Incident::STATUSES,
            ],
            'permissions' => [
                'operate' => $request->user()?->can(Permission::ReceptionOperate->value) ?? false,
                'incidents' => $request->user()?->can(Permission::ReceptionIncidents->value) ?? false,
            ],
        ]);
    }

    /**
     * Guest stay history and incidents.
     */
    public function guest(Client $client): Response
    {
        $this->authorize(Permission::ReceptionView->value);

        $reservations = $client->reservations()
            ->with(['room:id,name', 'checkedInBy:id,name', 'checkedOutBy:id,name'])
            ->orderByDesc('reserved_at')
            ->paginate(10, ['*'], 'stays_page')
            ->withQueryString();

        return Inertia::render('Reception/Guest', [
            'client' => $client->only([
                'id',
                'first_name',
                'last_name',
                'cedula',
                'rnc',
                'address',
                'phone_number',
                'active',
            ]),
            'reservations' => $reservations,
            'stats' => [
                'stays' => $client->reservations()->count(),
                'completed' => $client->reservations()->where('status', 'Finalizada')->count(),
                'inHouse' => $client->reservations()
                    ->where('status', 'En curso')
                    ->where('active', true)
                    ->exists(),
                'incidents' => Incident::query()->whereHas(
                    'reservation',
                    fn (Builder $query) => $query->where('client_id', $client->id),
                )->count(),
            ],
        ]);
    }

    public function checkIn(Request $request, Reservation $reservation): RedirectResponse
    {
        $this->authorize(Permission::ReceptionOperate->value);

        $validated = $request->validate([
            'room_id' => [
                'nullable',
                'integer',
                Rule::exists('rooms', 'id')
                    ->where('hotel_id', app(CurrentHotel::class)->id())
                    ->where('active', true),
            ],
        ]);

        app(ReceptionService::class)->checkIn(
            $reservation,
            $request->user(),
            isset($validated['room_id']) ? (int) $validated['room_id'] : null,
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Check-in registrado correctamente.',
        ]);

        return back();
    }

    public function checkOut(Request $request, Reservation $reservation): RedirectResponse
    {
        $this->authorize(Permission::ReceptionOperate->value);

        app(ReceptionService::class)->checkOut($reservation, $request->user());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Check-out registrado correctamente.',
        ]);

        return back();
    }

    public function changeRoom(Request $request, Reservation $reservation): RedirectResponse
    {
        $this->authorize(Permission::ReceptionOperate->value);

        $validated = $request->validate([
            'room_id' => [
                'required',
                'integer',
                Rule::exists('rooms', 'id')
                    ->where('hotel_id', app(CurrentHotel::class)->id())
                    ->where('active', true),
            ],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        app(ReceptionService::class)->changeRoom(
            $reservation,
            Room::findOrFail($validated['room_id']),
            $request->user(),
            $validated['reason'] ?? null,
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Habitación actualizada correctamente.',
        ]);

        return back();
    }

    public function storeIncident(Request $request): RedirectResponse
    {
        $this->authorize(Permission::ReceptionIncidents->value);

        $validated = $request->validate([
            'reservation_id' => [
                'nullable',
                'integer',
                Rule::exists('reservations', 'id')
                    ->where('hotel_id', app(CurrentHotel::class)->id()),
            ],
            'room_id' => [
                'nullable',
                'integer',
                Rule::exists('rooms', 'id')
                    ->where('hotel_id', app(CurrentHotel::class)->id()),
            ],
            'type' => ['required', Rule::in(Incident::TYPES)],
            'severity' => ['required', Rule::in(Incident::SEVERITIES)],
            'title' => ['required', 'string', 'max:120'],
            'description' => ['required', 'string', 'max:2000'],
        ]);

        if (empty($validated['room_id']) && ! empty($validated['reservation_id'])) {
            $validated['room_id'] = Reservation::find($validated['reservation_id'])?->room_id;
        }

        app(ReceptionService::class)->createIncident($validated, $request->user());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Incidencia registrada correctamente.',
        ]);

        return back();
    }

    public function updateIncident(Request $request, Incident $incident): RedirectResponse
    {
        $this->authorize(Permission::ReceptionIncidents->value);

        $validated = $request->validate([
            'status' => ['required', Rule::in(['en_proceso', 'abierta', 'resuelta'])],
            'resolution' => ['nullable', 'string', 'max:2000'],
        ]);

        app(ReceptionService::class)->updateIncident(
            $incident,
            $validated['status'],
            $request->user(),
            $validated['resolution'] ?? null,
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Incidencia actualizada correctamente.',
        ]);

        return back();
    }

    public function updateRoomStatus(Request $request, Room $room): RedirectResponse
    {
        $this->authorize(Permission::ReceptionOperate->value);

        $validated = $request->validate([
            'status' => ['required', Rule::in(RoomStatusLog::STATUSES)],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        app(ReceptionService::class)->updateRoomStatus(
            $room,
            $validated['status'],
            $request->user(),
            $validated['reason'] ?? null,
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Estado de la habitación actualizado.',
        ]);

        return back();
    }

    /**
     * @return Builder<Reservation>
     */
    private function arrivalQuery(
        CarbonImmutable $dayStartUtc,
        CarbonImmutable $dayEndUtc,
        string $search,
    ): Builder {
        return Reservation::query()
            ->with($this->reservationRelations())
            ->where('active', true)
            ->whereIn('status', self::ACTIVE_ARRIVAL_STATUSES)
            ->where('reserved_at', '>=', $dayStartUtc)
            ->where('reserved_at', '<=', $dayEndUtc)
            ->when($search !== '', fn (Builder $query) => $this->applyReservationSearch($query, $search));
    }

    /**
     * Departures due by the end of the selected day, including overdue stays.
     *
     * @return Builder<Reservation>
     */
    private function departureQuery(CarbonImmutable $dayEndUtc, string $search): Builder
    {
        return Reservation::query()
            ->with($this->reservationRelations())
            ->where('active', true)
            ->where('status', 'En curso')
            ->whereNotNull('finished_at')
            ->where('finished_at', '<=', $dayEndUtc)
            ->when($search !== '', fn (Builder $query) => $this->applyReservationSearch($query, $search));
    }

    /**
     * @return array<int|string, string>
     */
    private function reservationRelations(): array
    {
        return [
            'client:id,first_name,last_name,phone_number',
            'room:id,name',
            'checkedInBy:id,name',
            'checkedOutBy:id,name',
        ];
    }

    /**
     * @param  Builder<Reservation>  $query
     */
    private function applyReservationSearch(Builder $query, string $search): void
    {
        $query->where(function (Builder $query) use ($search): void {
            $query->where('status', 'like', "%{$search}%")
                ->orWhereHas('client', function (Builder $client) use ($search): void {
                    $client->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('cedula', 'like', "%{$search}%")
                        ->orWhere('phone_number', 'like', "%{$search}%");
                })
                ->orWhereHas('room', fn (Builder $room) => $room->where('name', 'like', "%{$search}%"));
        });
    }

    private function resolveDay(
        mixed $value,
        string $timezone,
        CarbonImmutable $now,
    ): CarbonImmutable {
        if (! is_string($value) || ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return $now;
        }

        $day = CarbonImmutable::createFromFormat('Y-m-d', $value, $timezone);

        if ($day === false) {
            return $now;
        }

        return $day->startOfDay();
    }
}
