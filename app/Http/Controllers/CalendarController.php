<?php

namespace App\Http\Controllers;

use App\Models\Calendar;
use App\Models\Reservation;
use App\Models\Room;
use App\Support\CurrentHotel;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CalendarController extends Controller
{
    /**
     * Event types accepted by the list filter.
     *
     * @var list<string>
     */
    private const TYPES = ['evento', 'bloqueo', 'mantenimiento'];

    /**
     * Validation rules shared by store and update.
     *
     * The room and the reservation must belong to the current hotel.
     *
     * @return array<string, mixed>
     */
    private function rules(): array
    {
        $hotelId = app(CurrentHotel::class)->id();

        return [
            'title' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'max:50'],
            'room_id' => ['nullable', Rule::exists('rooms', 'id')->where('hotel_id', $hotelId)],
            'reservation_id' => ['nullable', Rule::exists('reservations', 'id')->where('hotel_id', $hotelId)],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'description' => ['nullable', 'string'],
        ];
    }

    /**
     * Display the calendar grid or the paginated list of events.
     *
     * The month grid is calculated in the hotel timezone and covers the whole
     * weeks that contain the selected month, so the first and last rows are
     * not empty. Event dates are resolved to the hotel timezone as well.
     */
    public function index(Request $request): Response
    {
        $timezone = app(CurrentHotel::class)->model()?->timezone
            ?? config('app.timezone');

        $today = CarbonImmutable::now($timezone);
        $monthStart = $this->resolveMonth($request, $today);
        $gridStart = $monthStart->startOfWeek(CarbonImmutable::MONDAY);
        $gridEnd = $monthStart->endOfMonth()->endOfWeek(CarbonImmutable::SUNDAY);

        $query = Calendar::with(['room', 'reservation.client']);

        $this->applyFilters($query, $request);

        $events = (clone $query)
            ->orderBy('starts_at')
            ->paginate(10)
            ->withQueryString();

        $rangeStart = $gridStart->utc();
        $rangeEnd = $gridEnd->endOfDay()->utc();

        $monthEvents = (clone $query)
            ->where('starts_at', '<=', $rangeEnd)
            ->where(function (Builder $range) use ($rangeStart) {
                $range->where('ends_at', '>=', $rangeStart)
                    ->orWhere(function (Builder $openEnded) use ($rangeStart) {
                        $openEnded->whereNull('ends_at')
                            ->where('starts_at', '>=', $rangeStart);
                    });
            })
            ->orderBy('starts_at')
            ->get()
            ->map(function (Calendar $event) use ($timezone) {
                $start = $event->starts_at->copy()->setTimezone($timezone);
                $end = $event->ends_at?->copy()->setTimezone($timezone);

                return [
                    ...$event->toArray(),
                    'starts_at' => $event->starts_at->toIso8601String(),
                    'ends_at' => $event->ends_at?->toIso8601String(),
                    'starts_on' => $start->toDateString(),
                    'ends_on' => $end?->toDateString() ?? $start->toDateString(),
                    'start_time' => $start->format('H:i'),
                    'end_time' => $end?->format('H:i'),
                ];
            })
            ->values();

        $view = $request->string('view')->toString() === 'lista'
            ? 'lista'
            : 'calendario';

        return Inertia::render('Calendar/Index', [
            'events' => $events,
            'monthEvents' => $monthEvents,
            'view' => $view,
            'calendar' => [
                'month' => $monthStart->format('Y-m'),
                'label' => ucfirst($monthStart->locale('es')->translatedFormat('F Y')),
                'grid_start' => $gridStart->toDateString(),
                'grid_end' => $gridEnd->toDateString(),
                'today' => $today->toDateString(),
                'previous' => $monthStart->subMonthNoOverflow()->format('Y-m'),
                'next' => $monthStart->addMonthNoOverflow()->format('Y-m'),
                'timezone' => $timezone,
            ],
            'filters' => $request->only(['search', 'status', 'type']),
        ]);
    }

    /**
     * Resolve the requested month, ignoring malformed values.
     */
    private function resolveMonth(Request $request, CarbonImmutable $today): CarbonImmutable
    {
        $month = $request->string('month')->toString();

        if (preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $month) !== 1) {
            return $today->startOfMonth();
        }

        return CarbonImmutable::createFromFormat(
            '!Y-m-d',
            $month.'-01',
            $today->getTimezone(),
        )->startOfMonth();
    }

    /**
     * Apply the shared search and state filters to the event query.
     */
    private function applyFilters(Builder $query, Request $request): void
    {
        if ($request->filled('search')) {
            $search = $request->string('search')->toString();

            $query->where(function (Builder $q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('type', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('active', $request->boolean('status'));
        }

        $type = $request->string('type')->toString();

        if (in_array($type, self::TYPES, true)) {
            $query->where('type', $type);
        }
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(): Response
    {
        return Inertia::render('Calendar/Create', [
            'rooms' => Room::orderBy('name')->get(['id', 'name']),
            'reservations' => Reservation::with('client')->latest('id')->get(['id', 'client_id', 'room_id', 'reserved_at']),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate($this->rules());

        Calendar::create($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'El evento se registró correctamente.']);

        return to_route('calendars.index');
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): Response
    {
        $event = Calendar::with(['room', 'reservation.client'])->findOrFail($id);

        return Inertia::render('Calendar/Show', compact('event'));
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id): Response
    {
        $event = Calendar::findOrFail($id);

        return Inertia::render('Calendar/Edit', [
            'event' => $event,
            'rooms' => Room::orderBy('name')->get(['id', 'name']),
            'reservations' => Reservation::with('client')->latest('id')->get(['id', 'client_id', 'room_id', 'reserved_at']),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): RedirectResponse
    {
        $event = Calendar::findOrFail($id);

        $event->update($request->validate($this->rules()));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'El evento se actualizó correctamente.']);

        return to_route('calendars.index');
    }

    /**
     * Deactivate the specified resource.
     */
    public function destroy(string $id): RedirectResponse
    {
        $event = Calendar::findOrFail($id);

        $event->update(['active' => false]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'El evento se desactivó correctamente.']);

        return to_route('calendars.index');
    }

    /**
     * Restore a previously deactivated event.
     */
    public function restore(Calendar $calendar): RedirectResponse
    {
        $calendar->update(['active' => true]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'El evento se restauró correctamente.']);

        return to_route('calendars.index');
    }
}
