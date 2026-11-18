<?php

namespace App\Support;

use App\Models\Incident;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\RoomAssignment;
use App\Models\RoomStatusLog;
use Illuminate\Support\Collection;

/**
 * Shapes room data for the map panel and the Show page.
 *
 * Both surfaces use this presenter so the details cannot drift apart.
 */
final class RoomPresenter
{
    /**
     * Data needed by the map and the room form.
     *
     * @return array<string, mixed>
     */
    public static function base(Room $room): array
    {
        $room->loadMissing('area.building');
        $area = $room->area;

        return [
            'id' => $room->id,
            'name' => $room->name,
            'capacity' => $room->capacity,
            'category' => $room->category,
            'bed_count' => $room->bed_count,
            'amenities' => $room->amenities ?? [],
            'area_id' => $room->area_id,
            'pos_x' => $room->pos_x ?? 0,
            'pos_y' => $room->pos_y ?? 0,
            'width' => $room->width ?? 120,
            'height' => $room->height ?? 90,
            'rotation' => $room->rotation ?? 0,
            'shape' => $room->shape,
            'active' => (bool) $room->active,
            'description' => $room->description,
            'price' => $room->price,
            'phone' => $room->phone,
            'status' => $room->status,
            'area' => $area === null ? null : [
                'id' => $area->id,
                'name' => $area->name,
                'x' => $area->x,
                'y' => $area->y,
                'width' => $area->width,
                'height' => $area->height,
                'type' => $area->type,
                'color' => $area->color,
                'floor' => $area->floor,
                'building_id' => $area->building_id,
                'active' => (bool) $area->active,
                'building' => $area->building === null ? null : [
                    'id' => $area->building->id,
                    'name' => $area->building->name,
                ],
            ],
        ];
    }

    /**
     * Full detail used by the side panel and the Show page.
     *
     * @return array<string, mixed>
     */
    public static function panel(Room $room): array
    {
        $room->load([
            'area.building',
            'currentReservation.client',
            'currentReservation.checkedInBy',
            'statusLogs' => fn ($query) => $query
                ->with('changedBy:id,name')
                ->latest('id')
                ->limit(10),
        ]);

        $current = $room->currentReservation;

        $next = Reservation::query()
            ->with(['client:id,first_name,last_name', 'room:id,name'])
            ->where('room_id', $room->id)
            ->where('active', true)
            ->whereIn('status', ['Pendiente', 'Confirmada'])
            ->where('reserved_at', '>=', now())
            ->orderBy('reserved_at')
            ->first();

        $assignments = RoomAssignment::query()
            ->with(['fromRoom:id,name', 'toRoom:id,name', 'assignedBy:id,name'])
            ->where(fn ($query) => $query
                ->where('to_room_id', $room->id)
                ->orWhere('from_room_id', $room->id))
            ->latest('assigned_at')
            ->limit(10)
            ->get();

        $incidents = Incident::query()
            ->with('reportedBy:id,name')
            ->where('room_id', $room->id)
            ->whereIn('status', ['abierta', 'en_proceso'])
            ->latest('id')
            ->limit(5)
            ->get();

        return [
            ...self::base($room),
            'current_reservation' => $current === null ? null : self::reservation($current),
            'next_reservation' => $next === null ? null : self::reservation($next),
            'status_history' => self::statusHistory($room->statusLogs),
            'assignments' => self::assignments($assignments),
            'open_incidents' => $incidents->map(fn (Incident $incident): array => [
                'id' => $incident->id,
                'type' => $incident->type,
                'severity' => $incident->severity,
                'title' => $incident->title,
                'description' => $incident->description,
                'status' => $incident->status,
                'created_at' => $incident->created_at?->toIso8601String(),
                'reported_by' => $incident->reportedBy === null ? null : [
                    'id' => $incident->reportedBy->id,
                    'name' => $incident->reportedBy->name,
                ],
            ])->values()->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function reservation(Reservation $reservation): array
    {
        return [
            'id' => $reservation->id,
            'client_id' => $reservation->client_id,
            'room_id' => $reservation->room_id,
            'reserved_at' => $reservation->reserved_at->toIso8601String(),
            'finished_at' => $reservation->finished_at?->toIso8601String(),
            'checked_in_at' => $reservation->checked_in_at?->toIso8601String(),
            'checked_out_at' => $reservation->checked_out_at?->toIso8601String(),
            'guests' => $reservation->guests,
            'status' => $reservation->status,
            'active' => (bool) $reservation->active,
            'notes' => $reservation->notes,
            'client' => $reservation->client === null ? null : [
                'id' => $reservation->client->id,
                'first_name' => $reservation->client->first_name,
                'last_name' => $reservation->client->last_name,
                'phone_number' => $reservation->client->phone_number,
                'cedula' => $reservation->client->cedula,
            ],
            'room' => $reservation->room === null ? null : [
                'id' => $reservation->room->id,
                'name' => $reservation->room->name,
            ],
            'checked_in_by' => $reservation->checkedInBy === null ? null : [
                'id' => $reservation->checkedInBy->id,
                'name' => $reservation->checkedInBy->name,
            ],
        ];
    }

    /**
     * @param  Collection<int, RoomStatusLog>  $logs
     * @return array<int, array<string, mixed>>
     */
    private static function statusHistory(Collection $logs): array
    {
        return $logs->map(fn ($log): array => [
            'id' => $log->id,
            'previous_status' => $log->previous_status,
            'status' => $log->status,
            'reason' => $log->reason,
            'created_at' => $log->created_at?->toIso8601String(),
            'changed_by' => $log->changedBy === null ? null : [
                'id' => $log->changedBy->id,
                'name' => $log->changedBy->name,
            ],
        ])->values()->all();
    }

    /**
     * @param  Collection<int, RoomAssignment>  $assignments
     * @return array<int, array<string, mixed>>
     */
    private static function assignments(Collection $assignments): array
    {
        return $assignments->map(fn (RoomAssignment $assignment): array => [
            'id' => $assignment->id,
            'reservation_id' => $assignment->reservation_id,
            'assigned_at' => $assignment->assigned_at->toIso8601String(),
            'reason' => $assignment->reason,
            'from_room' => $assignment->fromRoom === null ? null : [
                'id' => $assignment->fromRoom->id,
                'name' => $assignment->fromRoom->name,
            ],
            'to_room' => $assignment->toRoom === null ? null : [
                'id' => $assignment->toRoom->id,
                'name' => $assignment->toRoom->name,
            ],
            'assigned_by' => $assignment->assignedBy === null ? null : [
                'id' => $assignment->assignedBy->id,
                'name' => $assignment->assignedBy->name,
            ],
        ])->values()->all();
    }
}
