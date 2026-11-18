<?php

namespace App\Services;

use App\Models\Incident;
use App\Models\Reservation;
use App\Models\Room;
use App\Models\RoomAssignment;
use App\Models\RoomStatusLog;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Reception operations that change more than one record at a time.
 *
 * Every method runs inside a transaction, locks the affected reservation and
 * rooms, and leaves an audit trail. The frontend never decides a transition;
 * these guards are the business rules.
 */
class ReceptionService
{
    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * Register the arrival of a guest and occupy the assigned room.
     */
    public function checkIn(Reservation $reservation, User $user, ?int $roomId = null): Reservation
    {
        return DB::transaction(function () use ($reservation, $user, $roomId): Reservation {
            $reservation = $this->lockReservation($reservation);

            if (! $reservation->active) {
                throw ValidationException::withMessages([
                    'reservation' => 'La reservación está inactiva y no puede registrar check-in.',
                ]);
            }

            if ($reservation->checked_in_at !== null || $reservation->status === 'En curso') {
                throw ValidationException::withMessages([
                    'reservation' => 'La reservación ya tiene check-in registrado.',
                ]);
            }

            if (! in_array($reservation->status, ['Pendiente', 'Confirmada'], true)) {
                throw ValidationException::withMessages([
                    'reservation' => 'Solo las reservaciones pendientes o confirmadas admiten check-in.',
                ]);
            }

            $targetRoomId = $roomId ?? $reservation->room_id;

            if ($targetRoomId === null) {
                throw ValidationException::withMessages([
                    'room_id' => 'Selecciona una habitación para el check-in.',
                ]);
            }

            $room = $this->lockRoom($targetRoomId);
            $this->assertRoomCanHost($room, $reservation);

            $previousRoomId = $reservation->room_id;
            $previousStatus = $reservation->status;

            $reservation->forceFill([
                'room_id' => $room->id,
                'status' => 'En curso',
                'checked_in_at' => now(),
                'checked_in_by' => $user->id,
            ])->save();

            $this->setRoomStatus($room, 'ocupada', $user, $reservation->id, 'Check-in');

            if ($previousRoomId !== null && $previousRoomId !== $room->id) {
                $this->releaseRoom($previousRoomId, $user, $reservation->id);
            }

            if ($previousRoomId !== $room->id) {
                RoomAssignment::create([
                    'hotel_id' => $reservation->hotel_id,
                    'reservation_id' => $reservation->id,
                    'from_room_id' => $previousRoomId,
                    'to_room_id' => $room->id,
                    'assigned_by' => $user->id,
                    'assigned_at' => now(),
                    'reason' => 'Asignación en check-in',
                ]);
            }

            $this->audit->record(
                module: 'reception',
                action: 'check_in',
                subject: $reservation,
                description: "Check-in de la reservación #{$reservation->id}",
                changes: [
                    'status' => ['before' => $previousStatus, 'after' => 'En curso'],
                    'room_id' => $room->id,
                    'checked_in_at' => $reservation->checked_in_at?->toIso8601String(),
                ],
            );

            return $reservation->refresh();
        });
    }

    /**
     * Close the stay and free the room.
     */
    public function checkOut(Reservation $reservation, User $user): Reservation
    {
        return DB::transaction(function () use ($reservation, $user): Reservation {
            $reservation = $this->lockReservation($reservation);

            if (! $reservation->active) {
                throw ValidationException::withMessages([
                    'reservation' => 'La reservación está inactiva y no puede registrar check-out.',
                ]);
            }

            if ($reservation->status !== 'En curso' || $reservation->checked_in_at === null) {
                throw ValidationException::withMessages([
                    'reservation' => 'Solo un huésped alojado puede registrar check-out.',
                ]);
            }

            $reservation->forceFill([
                'status' => 'Finalizada',
                'checked_out_at' => now(),
                'checked_out_by' => $user->id,
            ])->save();

            if ($reservation->room_id !== null) {
                $this->releaseRoom($reservation->room_id, $user, $reservation->id, 'Check-out');
            }

            $this->audit->record(
                module: 'reception',
                action: 'check_out',
                subject: $reservation,
                description: "Check-out de la reservación #{$reservation->id}",
                changes: [
                    'status' => ['before' => 'En curso', 'after' => 'Finalizada'],
                    'checked_out_at' => $reservation->checked_out_at?->toIso8601String(),
                ],
            );

            return $reservation->refresh();
        });
    }

    /**
     * Move an in-house guest to another room without ending the stay.
     */
    public function changeRoom(
        Reservation $reservation,
        Room $destination,
        User $user,
        ?string $reason = null,
    ): Reservation {
        return DB::transaction(function () use ($reservation, $destination, $user, $reason): Reservation {
            $reservation = $this->lockReservation($reservation);
            $destination = $this->lockRoom($destination->id);

            if (! $reservation->active || $reservation->status !== 'En curso' || $reservation->checked_in_at === null) {
                throw ValidationException::withMessages([
                    'reservation' => 'Solo un huésped alojado puede cambiar de habitación.',
                ]);
            }

            if ($reservation->room_id === $destination->id) {
                throw ValidationException::withMessages([
                    'room_id' => 'El huésped ya está en esa habitación.',
                ]);
            }

            $this->assertRoomCanHost($destination, $reservation, requireAvailable: true);

            $previousRoomId = $reservation->room_id;

            $reservation->forceFill(['room_id' => $destination->id])->save();

            $this->setRoomStatus($destination, 'ocupada', $user, $reservation->id, 'Cambio de habitación');

            if ($previousRoomId !== null) {
                $this->releaseRoom($previousRoomId, $user, $reservation->id, 'Cambio de habitación');
            }

            RoomAssignment::create([
                'hotel_id' => $reservation->hotel_id,
                'reservation_id' => $reservation->id,
                'from_room_id' => $previousRoomId,
                'to_room_id' => $destination->id,
                'assigned_by' => $user->id,
                'assigned_at' => now(),
                'reason' => $reason ?? 'Cambio de habitación',
            ]);

            $this->audit->record(
                module: 'reception',
                action: 'room_changed',
                subject: $reservation,
                description: "Cambio de habitación de la reservación #{$reservation->id}",
                changes: [
                    'room_id' => ['before' => $previousRoomId, 'after' => $destination->id],
                    'reason' => $reason,
                ],
            );

            return $reservation->refresh();
        });
    }

    /**
     * Change the operational status of a room manually.
     */
    public function updateRoomStatus(
        Room $room,
        string $status,
        User $user,
        ?string $reason = null,
    ): Room {
        return DB::transaction(function () use ($room, $status, $user, $reason): Room {
            $room = $this->lockRoom($room->id);

            $occupiedBy = Reservation::query()
                ->where('room_id', $room->id)
                ->where('status', 'En curso')
                ->where('active', true)
                ->first();

            if ($occupiedBy !== null && $status !== 'ocupada') {
                throw ValidationException::withMessages([
                    'status' => "La habitación está ocupada por la reservación #{$occupiedBy->id}. Registra el check-out antes de cambiar su estado.",
                ]);
            }

            if ($occupiedBy === null && $status === 'ocupada') {
                throw ValidationException::withMessages([
                    'status' => 'No hay un huésped alojado en esta habitación; usa el check-in para ocuparla.',
                ]);
            }

            $previous = $room->status;
            $this->setRoomStatus($room, $status, $user, $occupiedBy?->id, $reason);

            $this->audit->record(
                module: 'reception',
                action: 'room_status_changed',
                subject: $room,
                description: "Estado de la habitación {$room->name} actualizado",
                changes: [
                    'status' => ['before' => $previous, 'after' => $status],
                    'reason' => $reason,
                ],
            );

            return $room->refresh();
        });
    }

    /**
     * Report an incident in a room or reservation.
     *
     * @param  array<string, mixed>  $data
     */
    public function createIncident(array $data, User $user): Incident
    {
        return DB::transaction(function () use ($data, $user): Incident {
            $incident = Incident::create([
                ...$data,
                'status' => 'abierta',
                'reported_by' => $user->id,
            ]);

            $this->audit->record(
                module: 'reception',
                action: 'incident_created',
                subject: $incident,
                description: "Incidencia registrada: {$incident->title}",
                changes: [
                    'type' => $incident->type,
                    'severity' => $incident->severity,
                    'room_id' => $incident->room_id,
                    'reservation_id' => $incident->reservation_id,
                ],
            );

            return $incident;
        });
    }

    /**
     * Advance the incident workflow.
     */
    public function updateIncident(
        Incident $incident,
        string $status,
        User $user,
        ?string $resolution = null,
    ): Incident {
        return DB::transaction(function () use ($incident, $status, $user, $resolution): Incident {
            $incident = Incident::query()->lockForUpdate()->findOrFail($incident->getKey());

            $allowed = [
                'abierta' => ['en_proceso', 'resuelta'],
                'en_proceso' => ['abierta', 'resuelta'],
                'resuelta' => [],
            ];

            $previous = $incident->status;

            if (! in_array($status, $allowed[$previous] ?? [], true)) {
                throw ValidationException::withMessages([
                    'status' => "No se puede pasar la incidencia de \"{$previous}\" a \"{$status}\".",
                ]);
            }

            if ($status === 'resuelta' && blank($resolution)) {
                throw ValidationException::withMessages([
                    'resolution' => 'Describe la solución aplicada antes de cerrar la incidencia.',
                ]);
            }

            $incident->forceFill([
                'status' => $status,
                'resolution' => $resolution ?? $incident->resolution,
                'resolved_by' => $status === 'resuelta' ? $user->id : null,
                'resolved_at' => $status === 'resuelta' ? now() : null,
            ])->save();

            $this->audit->record(
                module: 'reception',
                action: 'incident_updated',
                subject: $incident,
                description: "Incidencia #{$incident->id} actualizada",
                changes: [
                    'status' => ['before' => $previous, 'after' => $status],
                    'resolution' => $resolution,
                ],
            );

            return $incident->refresh();
        });
    }

    private function lockReservation(Reservation $reservation): Reservation
    {
        return Reservation::query()->lockForUpdate()->findOrFail($reservation->getKey());
    }

    private function lockRoom(int $roomId): Room
    {
        return Room::query()->lockForUpdate()->findOrFail($roomId);
    }

    /**
     * A room can host a guest when it is active, not under maintenance and no
     * other in-house reservation is using it.
     */
    private function assertRoomCanHost(
        Room $room,
        Reservation $reservation,
        bool $requireAvailable = false,
    ): void {
        if (! $room->active) {
            throw ValidationException::withMessages([
                'room_id' => 'La habitación está inactiva.',
            ]);
        }

        if ($room->status === 'mantenimiento') {
            throw ValidationException::withMessages([
                'room_id' => 'La habitación está en mantenimiento.',
            ]);
        }

        if ($requireAvailable && $room->status !== 'disponible') {
            throw ValidationException::withMessages([
                'room_id' => 'La habitación destino debe estar disponible.',
            ]);
        }

        $occupied = Reservation::query()
            ->where('room_id', $room->id)
            ->where('status', 'En curso')
            ->where('active', true)
            ->whereKeyNot($reservation->getKey())
            ->exists();

        if ($occupied) {
            throw ValidationException::withMessages([
                'room_id' => 'La habitación ya está ocupada por otro huésped.',
            ]);
        }
    }

    /**
     * Free a room unless it is under maintenance.
     */
    private function releaseRoom(
        int $roomId,
        User $user,
        int $reservationId,
        ?string $reason = null,
    ): void {
        $room = Room::query()->lockForUpdate()->find($roomId);

        if ($room === null || $room->status === 'mantenimiento') {
            return;
        }

        $this->setRoomStatus($room, 'disponible', $user, $reservationId, $reason);
    }

    private function setRoomStatus(
        Room $room,
        string $status,
        User $user,
        ?int $reservationId = null,
        ?string $reason = null,
    ): void {
        $previous = $room->status;

        if ($previous === $status) {
            return;
        }

        $room->forceFill(['status' => $status])->save();

        RoomStatusLog::create([
            'hotel_id' => $room->hotel_id,
            'room_id' => $room->id,
            'previous_status' => $previous,
            'status' => $status,
            'reservation_id' => $reservationId,
            'changed_by' => $user->id,
            'reason' => $reason,
        ]);
    }
}
