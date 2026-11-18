<?php

namespace App\Http\Controllers;

use App\Models\Bill;
use App\Models\Client;
use App\Models\Reservation;
use App\Models\Room;
use App\Support\CurrentHotel;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Reservations in these states no longer count as active operation.
     *
     * @var list<string>
     */
    private const CLOSED_STATUSES = ['Cancelada', 'Finalizada'];

    /**
     * Statuses used by the reservation form, in business order.
     *
     * @var list<string>
     */
    private const RESERVATION_STATUSES = ['Pendiente', 'Confirmada', 'En curso', 'Finalizada', 'Cancelada'];

    public function __invoke(): Response
    {
        $hotel = app(CurrentHotel::class)->model();
        $timezone = $hotel?->timezone ?? config('app.timezone');
        $currency = $hotel?->currency ?? 'DOP';

        $now = now($timezone);
        $today = $now->copy()->startOfDay();
        $tomorrow = $today->copy()->addDay();
        $todayDate = $today->toDateString();

        // Dates (bills) use the hotel timezone; timestamps (reservations) are
        // stored in the application timezone, so boundaries are converted.
        $todayUtc = $today->copy()->utc();
        $tomorrowUtc = $tomorrow->copy()->utc();

        $revenueToday = $this->invoicedBetween($todayDate, $todayDate);
        $paidToday = $this->paidBetween($todayDate, $todayDate);
        $revenueYesterday = $this->invoicedBetween(
            $today->copy()->subDay()->toDateString(),
            $today->copy()->subDay()->toDateString(),
        );

        $monthStart = $today->copy()->startOfMonth();
        $nextMonthStart = $monthStart->copy()->addMonth();
        $previousMonthStart = $monthStart->copy()->subMonth();

        $revenueMonth = $this->invoicedBetween(
            $monthStart->toDateString(),
            $nextMonthStart->copy()->subDay()->toDateString(),
        );
        $paidMonth = $this->paidBetween(
            $monthStart->toDateString(),
            $nextMonthStart->copy()->subDay()->toDateString(),
        );
        $revenuePreviousMonth = $this->invoicedBetween(
            $previousMonthStart->toDateString(),
            $monthStart->copy()->subDay()->toDateString(),
        );

        $operationalReservations = Reservation::query()
            ->where('active', true)
            ->whereNotIn('status', self::CLOSED_STATUSES);

        $activeReservations = (clone $operationalReservations)->count();
        $pendingReservations = (clone $operationalReservations)
            ->where('status', 'Pendiente')
            ->count();

        $inHouse = (clone $operationalReservations)->where('status', 'En curso');
        $inHouseReservations = (clone $inHouse)->count();
        $inHouseGuests = (int) (clone $inHouse)->sum('guests');

        $roomCounts = Room::query()
            ->where('active', true)
            ->selectRaw('status, count(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status')
            ->mapWithKeys(fn (int|string $count, string $status) => [
                strtolower($status) => (int) $count,
            ]);

        $totalRooms = (int) $roomCounts->sum();
        $occupiedRooms = (int) ($roomCounts['ocupada'] ?? 0);
        $availableRooms = (int) ($roomCounts['disponible'] ?? 0);
        $reservedRooms = (int) ($roomCounts['reservada'] ?? 0);
        $maintenanceRooms = (int) ($roomCounts['mantenimiento'] ?? 0);
        $occupancyRate = $totalRooms > 0
            ? round(($occupiedRooms / $totalRooms) * 100, 1)
            : 0.0;

        return Inertia::render('dashboard', [
            'currency' => $currency,
            'timezone' => $timezone,
            'generatedAt' => $now->toIso8601String(),
            'kpis' => [
                'revenueToday' => $revenueToday,
                'paidToday' => $paidToday,
                'revenueTodayChange' => $this->percentChange($revenueToday, $revenueYesterday),
                'revenueMonth' => $revenueMonth,
                'paidMonth' => $paidMonth,
                'revenueMonthChange' => $this->percentChange($revenueMonth, $revenuePreviousMonth),
                'activeReservations' => $activeReservations,
                'pendingReservations' => $pendingReservations,
                'inHouseReservations' => $inHouseReservations,
                'inHouseGuests' => $inHouseGuests,
                'totalRooms' => $totalRooms,
                'occupiedRooms' => $occupiedRooms,
                'availableRooms' => $availableRooms,
                'reservedRooms' => $reservedRooms,
                'maintenanceRooms' => $maintenanceRooms,
                'occupancyRate' => $occupancyRate,
            ],
            'revenueSeries' => $this->revenueSeries($today),
            'reservationTrend' => $this->reservationTrend($today, $tomorrowUtc, $timezone),
            'reservationsByStatus' => $this->reservationsByStatus(),
            'roomDistribution' => $this->roomDistribution(),
            'recentReservations' => $this->recentReservations(),
            'upcomingCheckIns' => $this->upcomingCheckIns($todayUtc),
            'upcomingCheckOuts' => $this->upcomingCheckOuts($todayUtc),
            'recentBills' => $this->recentBills(),
        ]);
    }

    /**
     * Active bills that were not voided.
     */
    private function billQuery(): Builder
    {
        return Bill::query()
            ->where('active', true)
            ->where('status', '!=', 'Anulada');
    }

    private function invoicedBetween(string $from, string $to): float
    {
        return round((float) $this->billQuery()
            ->whereDate('issued_at', '>=', $from)
            ->whereDate('issued_at', '<=', $to)
            ->sum('total'), 2);
    }

    private function paidBetween(string $from, string $to): float
    {
        return round((float) $this->billQuery()
            ->where('status', 'Pagada')
            ->whereDate('issued_at', '>=', $from)
            ->whereDate('issued_at', '<=', $to)
            ->sum('total'), 2);
    }

    private function percentChange(float $current, float $previous): ?float
    {
        if ($previous <= 0.0) {
            return null;
        }

        return round((($current - $previous) / $previous) * 100, 1);
    }

    /**
     * Invoiced and collected totals for the last 30 hotel-local days.
     *
     * @return list<array{date: string, invoiced: float, paid: float}>
     */
    private function revenueSeries(CarbonInterface $today): array
    {
        $start = $today->copy()->subDays(29);
        $bills = $this->billQuery()
            ->whereDate('issued_at', '>=', $start->toDateString())
            ->whereDate('issued_at', '<=', $today->toDateString())
            ->get(['issued_at', 'total', 'status']);

        $byDate = $bills->groupBy(
            fn (Bill $bill) => $bill->issued_at?->toDateString(),
        );

        return collect(range(0, 29))
            ->map(function (int $offset) use ($start, $byDate): array {
                $date = $start->copy()->addDays($offset)->toDateString();
                $dayBills = $byDate->get($date, collect());

                return [
                    'date' => $date,
                    'invoiced' => round((float) $dayBills->sum('total'), 2),
                    'paid' => round((float) $dayBills
                        ->where('status', 'Pagada')
                        ->sum('total'), 2),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Reservations created per day during the last 14 hotel-local days.
     *
     * @return list<array{date: string, count: int}>
     */
    private function reservationTrend(
        CarbonInterface $today,
        CarbonInterface $tomorrowUtc,
        string $timezone,
    ): array {
        $start = $today->copy()->subDays(13);

        $counts = Reservation::query()
            ->where('active', true)
            ->where('reserved_at', '>=', $start->copy()->utc())
            ->where('reserved_at', '<', $tomorrowUtc)
            ->get(['reserved_at'])
            ->countBy(
                fn (Reservation $reservation) => $reservation->reserved_at
                    ?->copy()
                    ->setTimezone($timezone)
                    ->toDateString(),
            );

        return collect(range(0, 13))
            ->map(function (int $offset) use ($start, $counts): array {
                $date = $start->copy()->addDays($offset)->toDateString();

                return [
                    'date' => $date,
                    'count' => (int) ($counts[$date] ?? 0),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return list<array{status: string, count: int}>
     */
    private function reservationsByStatus(): array
    {
        $counts = Reservation::query()
            ->where('active', true)
            ->selectRaw('status, count(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        $statuses = collect(self::RESERVATION_STATUSES)
            ->map(fn (string $status): array => [
                'status' => $status,
                'count' => (int) ($counts[$status] ?? 0),
            ]);

        // Keep any custom status already stored in the database visible.
        $extra = $counts
            ->except(self::RESERVATION_STATUSES)
            ->map(fn (int|string $count, string $status): array => [
                'status' => $status,
                'count' => (int) $count,
            ])
            ->values();

        return $statuses->concat($extra)->all();
    }

    /**
     * @return list<array{area: string, count: int}>
     */
    private function roomDistribution(): array
    {
        return Room::query()
            ->where('active', true)
            ->with('area:id,name')
            ->get(['id', 'area_id'])
            ->groupBy(fn (Room $room) => $room->area?->name ?? 'Sin Ã¡rea')
            ->map(fn ($rooms, string $area): array => [
                'area' => $area,
                'count' => $rooms->count(),
            ])
            ->sortByDesc('count')
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function recentReservations(): array
    {
        return Reservation::query()
            ->with(['client:id,first_name,last_name', 'room:id,name'])
            ->where('active', true)
            ->latest('id')
            ->limit(6)
            ->get()
            ->map(fn (Reservation $reservation) => $this->reservationPayload($reservation))
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function upcomingCheckIns(CarbonInterface $todayUtc): array
    {
        return Reservation::query()
            ->with(['client:id,first_name,last_name', 'room:id,name'])
            ->where('active', true)
            ->whereIn('status', ['Pendiente', 'Confirmada'])
            ->where('reserved_at', '>=', $todayUtc)
            ->orderBy('reserved_at')
            ->limit(5)
            ->get()
            ->map(fn (Reservation $reservation) => $this->reservationPayload($reservation))
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function upcomingCheckOuts(CarbonInterface $todayUtc): array
    {
        return Reservation::query()
            ->with(['client:id,first_name,last_name', 'room:id,name'])
            ->where('active', true)
            ->where('status', 'En curso')
            ->whereNotNull('finished_at')
            ->where('finished_at', '>=', $todayUtc)
            ->orderBy('finished_at')
            ->limit(5)
            ->get()
            ->map(fn (Reservation $reservation) => $this->reservationPayload($reservation))
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function recentBills(): array
    {
        return Bill::query()
            ->with('client:id,first_name,last_name')
            ->where('active', true)
            ->orderByDesc('issued_at')
            ->orderByDesc('id')
            ->limit(5)
            ->get()
            ->map(fn (Bill $bill): array => [
                'id' => $bill->id,
                'number' => $bill->number,
                'client' => $this->clientName($bill->client),
                'issuedAt' => $bill->issued_at?->toDateString(),
                'total' => (float) $bill->total,
                'status' => $bill->status,
                'active' => $bill->active,
            ])
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function reservationPayload(Reservation $reservation): array
    {
        return [
            'id' => $reservation->id,
            'client' => $this->clientName($reservation->client),
            'room' => $reservation->room?->name ?? 'Sin habitaciÃ³n',
            'reservedAt' => $reservation->reserved_at?->toIso8601String(),
            'finishedAt' => $reservation->finished_at?->toIso8601String(),
            'guests' => (int) $reservation->guests,
            'status' => $reservation->status,
            'active' => $reservation->active,
        ];
    }

    private function clientName(?Client $client): string
    {
        if ($client === null) {
            return 'Sin huÃ©sped';
        }

        return trim($client->first_name.' '.$client->last_name);
    }
}
