<?php

namespace App\Http\Controllers;

use App\Models\Area;
use App\Models\Building;
use App\Models\Incident;
use App\Models\Reservation;
use App\Models\Room;
use App\Services\AuditLogger;
use App\Support\AreaType;
use App\Support\CurrentHotel;
use App\Support\Permission;
use App\Support\RoomPresenter;
use App\Support\RoomStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RoomController extends Controller
{
    /**
     * Validation rules shared by store and the settings update.
     *
     * @return array<string, mixed>
     */
    private function rules(): array
    {
        $hotelId = app(CurrentHotel::class)->id();

        return [
            'name' => ['required', 'string', 'max:50'],
            'capacity' => ['required', 'integer', 'min:1', 'max:50'],
            'category' => ['nullable', 'string', 'max:50'],
            'bed_count' => ['nullable', 'integer', 'min:1', 'max:20'],
            'amenities' => ['nullable', 'array', 'max:30'],
            'amenities.*' => ['string', 'max:60'],
            'shape' => ['required', 'string', 'max:30'],
            'area_id' => ['required', Rule::exists('areas', 'id')->where('hotel_id', $hotelId)],
            'description' => ['nullable', 'string', 'max:2000'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'phone' => ['nullable', 'string', 'max:50'],
            'status' => ['nullable', Rule::in(RoomStatus::ALL)],
        ];
    }

    /**
     * Validation rules used when a single room is moved on the map.
     *
     * @return array<string, mixed>
     */
    private function positionRules(): array
    {
        $hotelId = app(CurrentHotel::class)->id();

        return [
            'pos_x' => ['required', 'integer', 'min:0', 'max:20000'],
            'pos_y' => ['required', 'integer', 'min:0', 'max:20000'],
            'width' => ['sometimes', 'integer', 'min:40', 'max:2000'],
            'height' => ['sometimes', 'integer', 'min:40', 'max:2000'],
            'rotation' => ['sometimes', 'integer', 'min:0', 'max:359'],
            'area_id' => ['sometimes', 'integer', Rule::exists('areas', 'id')->where('hotel_id', $hotelId)],
        ];
    }

    /**
     * Display the map with every area and room of the current hotel.
     */
    public function index(Request $request): Response
    {
        $this->authorize(Permission::RoomsView->value);

        $areas = Area::query()
            ->with('building:id,name')
            ->where('active', true)
            ->orderBy('name')
            ->get();

        $currentArea = $request->filled('area_id')
            ? $areas->firstWhere('id', (int) $request->input('area_id'))
            : $areas->first();

        $currentArea ??= $areas->first();

        $status = (string) $request->input('status', '');

        $rooms = Room::query()
            ->with('area.building')
            ->when(
                $request->filled('area_id'),
                fn ($query) => $query->where('area_id', (int) $request->input('area_id')),
            )
            ->when(
                in_array($status, RoomStatus::ALL, true),
                fn ($query) => $query->where('status', $status),
            )
            ->when(
                $request->has('active'),
                fn ($query) => $query->where('active', $request->boolean('active')),
            )
            ->when(
                $request->filled('search'),
                fn ($query) => $query->where('name', 'like', '%'.$request->string('search').'%'),
            )
            ->orderBy('name')
            ->get();

        return Inertia::render('Rooms/Index', [
            'areas' => $areas,
            'currentArea' => $currentArea,
            'rooms' => $rooms,
            'buildings' => Building::query()
                ->where('active', true)
                ->orderBy('name')
                ->get(['id', 'name']),
            'statuses' => RoomStatus::ALL,
            ...$this->panelOptions(),
        ]);
    }

    /**
     * Data the side panel needs to run reception actions without leaving the
     * map. It mirrors the options already used by the reception center.
     *
     * @return array<string, mixed>
     */
    private function panelOptions(): array
    {
        return [
            'roomsForAssignment' => Room::query()
                ->where('active', true)
                ->whereNotIn('status', [RoomStatus::MANTENIMIENTO, RoomStatus::LIMPIEZA])
                ->orderBy('name')
                ->get(['id', 'name', 'status']),
            'roomsForIncidents' => Room::query()
                ->where('active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'status']),
            'reservationsForIncidents' => Reservation::query()
                ->where('active', true)
                ->where('status', 'En curso')
                ->with('client:id,first_name,last_name')
                ->orderBy('id')
                ->get(['id', 'client_id', 'room_id']),
            'roomStatuses' => RoomStatus::ALL,
            'incidentTypes' => Incident::TYPES,
            'incidentSeverities' => Incident::SEVERITIES,
        ];
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(): Response
    {
        $this->authorize(Permission::RoomsManage->value);

        return Inertia::render('Rooms/Create', [
            'areas' => Area::query()
                ->with('building:id,name')
                ->where('active', true)
                ->orderBy('name')
                ->get(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $this->authorize(Permission::RoomsManage->value);

        $validated = $request->validate($this->rules());

        $area = Area::query()->findOrFail((int) $validated['area_id']);

        $width = min(120, $area->width);
        $height = min(90, $area->height);

        Room::create([
            ...$validated,
            'category' => $validated['category'] ?? null,
            'bed_count' => $validated['bed_count'] ?? 1,
            'amenities' => $validated['amenities'] ?? null,
            'status' => $validated['status'] ?? RoomStatus::DISPONIBLE,
            'pos_x' => max(0, min(20, $area->width - $width)),
            'pos_y' => max(0, min(20, $area->height - $height)),
            'width' => $width,
            'height' => $height,
            'rotation' => 0,
        ]);

        app(AuditLogger::class)->record(
            module: 'rooms',
            action: 'room_created',
            description: "Habitación {$validated['name']} creada",
            changes: [
                'name' => $validated['name'],
                'area_id' => $area->id,
                'status' => $validated['status'] ?? RoomStatus::DISPONIBLE,
            ],
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => 'La habitación se registró correctamente.']);

        return to_route('rooms.index');
    }

    /**
     * Display the specified resource.
     */
    public function show(Room $room): Response
    {
        $this->authorize(Permission::RoomsView->value);

        return Inertia::render('Rooms/Show', [
            'room' => RoomPresenter::panel($room),
            ...$this->panelOptions(),
        ]);
    }

    /**
     * Detail payload used by the map drawer without a full page visit.
     */
    public function details(Room $room): JsonResponse
    {
        $this->authorize(Permission::RoomsView->value);

        return response()->json([
            'room' => RoomPresenter::panel($room),
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Room $room): Response
    {
        $this->authorize(Permission::RoomsManage->value);

        return Inertia::render('Rooms/Edit', [
            'room' => RoomPresenter::base($room),
            'areas' => Area::query()
                ->with('building:id,name')
                ->where('active', true)
                ->orderBy('name')
                ->get(),
        ]);
    }

    /**
     * Update the specified resource in storage.
     *
     * `settings` keeps the room profile form; any other payload is treated as
     * a single geometry move so older clients keep working.
     */
    public function update(Request $request, Room $room): RedirectResponse
    {
        if ($request->boolean('settings')) {
            $this->authorize(Permission::RoomsManage->value);

            $validated = $request->validate($this->rules());

            if (($validated['status'] ?? null) === null) {
                unset($validated['status']);
            }

            $room->update($validated);

            app(AuditLogger::class)->record(
                module: 'rooms',
                action: 'room_updated',
                subject: $room,
                description: "Habitación {$room->name} actualizada",
                changes: ['attributes' => array_keys($validated)],
            );

            Inertia::flash('toast', ['type' => 'success', 'message' => 'La habitación se actualizó correctamente.']);

            return to_route('rooms.index');
        }

        $this->authorize(Permission::RoomsLayout->value);

        $validated = $request->validate($this->positionRules());

        $area = isset($validated['area_id'])
            ? Area::query()->findOrFail((int) $validated['area_id'])
            : $room->area;

        if ($area === null) {
            throw ValidationException::withMessages([
                'area_id' => 'La habitación no tiene un área asignada.',
            ]);
        }

        $this->assertRoomFits(
            index: 0,
            name: $room->name,
            x: $validated['pos_x'],
            y: $validated['pos_y'],
            width: $validated['width'] ?? $room->width ?? 120,
            height: $validated['height'] ?? $room->height ?? 90,
            area: $area,
        );

        $room->update($validated);

        app(AuditLogger::class)->record(
            module: 'rooms',
            action: 'room_moved',
            subject: $room,
            description: "Habitación {$room->name} movida en el plano",
            changes: [
                'pos_x' => $validated['pos_x'],
                'pos_y' => $validated['pos_y'],
                'area_id' => $area->id,
            ],
        );

        return back();
    }

    /**
     * Persist the whole layout in one transaction.
     */
    public function updateLayout(Request $request): RedirectResponse
    {
        $this->authorize(Permission::RoomsLayout->value);

        $hotelId = app(CurrentHotel::class)->id();

        $validated = $request->validate([
            'areas' => ['required', 'array', 'max:200'],
            'areas.*.id' => ['required', 'integer', 'distinct', Rule::exists('areas', 'id')->where('hotel_id', $hotelId)],
            'areas.*.x' => ['required', 'integer', 'min:0', 'max:20000'],
            'areas.*.y' => ['required', 'integer', 'min:0', 'max:20000'],
            'areas.*.width' => ['required', 'integer', 'min:100', 'max:5000'],
            'areas.*.height' => ['required', 'integer', 'min:100', 'max:5000'],
            'areas.*.type' => ['required', 'string', Rule::in(AreaType::ALL)],
            'areas.*.color' => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'areas.*.floor' => ['nullable', 'integer', 'min:0', 'max:200'],
            'areas.*.building_id' => ['nullable', 'integer', Rule::exists('buildings', 'id')->where('hotel_id', $hotelId)],
            'areas.*.active' => ['sometimes', 'boolean'],

            'rooms' => ['required', 'array', 'max:1000'],
            'rooms.*.id' => ['required', 'integer', 'distinct', Rule::exists('rooms', 'id')->where('hotel_id', $hotelId)],
            'rooms.*.area_id' => ['required', 'integer', Rule::exists('areas', 'id')->where('hotel_id', $hotelId)],
            'rooms.*.pos_x' => ['required', 'integer', 'min:0', 'max:20000'],
            'rooms.*.pos_y' => ['required', 'integer', 'min:0', 'max:20000'],
            'rooms.*.width' => ['required', 'integer', 'min:40', 'max:2000'],
            'rooms.*.height' => ['required', 'integer', 'min:40', 'max:2000'],
            'rooms.*.rotation' => ['sometimes', 'integer', 'min:0', 'max:359'],
        ]);

        $areaIds = array_values(array_unique([
            ...array_map('intval', array_column($validated['areas'], 'id')),
            ...array_map('intval', array_column($validated['rooms'], 'area_id')),
        ]));

        /** @var array<int, array<string, mixed>> $areaPayload */
        $areaPayload = [];
        foreach ($validated['areas'] as $area) {
            $areaPayload[(int) $area['id']] = $area;
        }

        /** @var array<int, array<string, mixed>> $roomPayload */
        $roomPayload = [];
        foreach ($validated['rooms'] as $room) {
            $roomPayload[(int) $room['id']] = $room;
        }

        /** @var array<int, Area> $areas */
        $areas = [];
        foreach (Area::query()->whereIn('id', $areaIds)->get() as $areaModel) {
            $areas[(int) $areaModel->id] = $areaModel;
        }

        // Every room assigned to an area in the payload must fit, including
        // rooms that were not moved and therefore are not in the payload.
        $existingRooms = Room::query()
            ->whereIn('area_id', $areaIds)
            ->get();

        foreach ($existingRooms as $room) {
            $payload = $roomPayload[$room->id] ?? null;

            $areaId = (int) ($payload['area_id'] ?? $room->area_id);
            $areaData = $areaPayload[$areaId] ?? null;
            $area = $areas[$areaId] ?? null;

            if ($area === null) {
                continue;
            }

            $width = (int) ($payload['width'] ?? $room->width ?? 120);
            $height = (int) ($payload['height'] ?? $room->height ?? 90);
            $x = (int) ($payload['pos_x'] ?? $room->pos_x ?? 0);
            $y = (int) ($payload['pos_y'] ?? $room->pos_y ?? 0);

            $areaWidth = $areaData === null ? $area->width : (int) $areaData['width'];
            $areaHeight = $areaData === null ? $area->height : (int) $areaData['height'];

            if ($x + $width > $areaWidth || $y + $height > $areaHeight) {
                $index = array_search($room->id, array_column($validated['rooms'], 'id'), true);

                throw ValidationException::withMessages([
                    'rooms.'.(is_int($index) ? $index : 0).'.pos_x' => "La habitación {$room->name} no cabe dentro del área {$area->name}.",
                ]);
            }
        }

        DB::transaction(function () use ($validated, $areas): void {
            foreach ($validated['areas'] as $data) {
                $area = $areas[(int) $data['id']] ?? null;

                if ($area === null) {
                    continue;
                }

                $area->update([
                    'x' => (int) $data['x'],
                    'y' => (int) $data['y'],
                    'width' => (int) $data['width'],
                    'height' => (int) $data['height'],
                    'type' => $data['type'],
                    'color' => $data['color'] ?? null,
                    'floor' => $data['floor'] ?? null,
                    'building_id' => $data['building_id'] ?? null,
                    'active' => (bool) ($data['active'] ?? true),
                ]);
            }

            foreach ($validated['rooms'] as $data) {
                $room = Room::query()->find((int) $data['id']);

                if ($room === null) {
                    continue;
                }

                $room->update([
                    'area_id' => (int) $data['area_id'],
                    'pos_x' => (int) $data['pos_x'],
                    'pos_y' => (int) $data['pos_y'],
                    'width' => (int) $data['width'],
                    'height' => (int) $data['height'],
                    'rotation' => (int) ($data['rotation'] ?? 0),
                ]);
            }
        });

        app(AuditLogger::class)->record(
            module: 'rooms',
            action: 'layout_updated',
            description: 'Plano de habitaciones actualizado',
            changes: [
                'areas' => count($validated['areas']),
                'rooms' => count($validated['rooms']),
            ],
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => 'El plano se guardó correctamente.']);

        return back();
    }

    /**
     * Deactivate the specified resource.
     */
    public function destroy(Room $room): RedirectResponse
    {
        $this->authorize(Permission::RoomsManage->value);

        $room->update(['active' => false]);

        app(AuditLogger::class)->record(
            module: 'rooms',
            action: 'room_deactivated',
            subject: $room,
            description: "Habitación {$room->name} desactivada",
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => 'La habitación se desactivó correctamente.']);

        return to_route('rooms.index');
    }

    private function assertRoomFits(
        int $index,
        string $name,
        int $x,
        int $y,
        int $width,
        int $height,
        Area $area,
    ): void {
        if ($width < 40 || $height < 40) {
            throw ValidationException::withMessages([
                "rooms.{$index}.width" => 'La habitación debe medir al menos 40 × 40.',
            ]);
        }

        if ($x + $width > $area->width || $y + $height > $area->height) {
            throw ValidationException::withMessages([
                "rooms.{$index}.pos_x" => "La habitación {$name} no cabe dentro del área {$area->name}.",
            ]);
        }
    }
}
