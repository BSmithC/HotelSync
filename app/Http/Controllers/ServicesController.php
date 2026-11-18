<?php

namespace App\Http\Controllers;

use App\Models\Bill;
use App\Models\Client;
use App\Models\Reservation;
use App\Models\Service;
use App\Models\ServiceRequest;
use App\Services\ServiceDeskService;
use App\Support\CurrentHotel;
use App\Support\Permission;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ServicesController extends Controller
{
    /**
     * @var list<string>
     */
    private const SERVICE_STATES = ['activo', 'inactivo'];

    /**
     * Service desk operations center: catalog, guest requests and their
     * conversion into invoice lines, scoped to the current hotel and period.
     */
    public function index(Request $request): Response
    {
        $this->authorize(Permission::ServicesView->value);

        $hotel = app(CurrentHotel::class)->model();
        $timezone = $hotel?->timezone ?? config('app.timezone');
        $currency = $hotel?->currency ?? 'DOP';

        [$from, $to] = $this->resolvePeriod($request, $timezone);

        $tab = (string) $request->input('tab', 'resumen');
        $tab = in_array($tab, ['resumen', 'catalogo', 'solicitudes'], true)
            ? $tab
            : 'resumen';

        $search = trim((string) $request->input('search', ''));
        $category = $this->filterValue($request, 'category', Service::CATEGORIES);
        $serviceState = $this->filterValue($request, 'service_state', self::SERVICE_STATES);
        $requestState = $this->filterValue($request, 'request_state', ServiceRequest::STATUSES);

        $services = $this->servicesQuery($search, $category, $serviceState)
            ->withCount('requests')
            ->orderBy('name')
            ->paginate(10, ['*'], 'services_page')
            ->withQueryString();

        $requests = $this->requestsQuery($from, $to, $search, $requestState)
            ->latest('requested_at')
            ->latest('id')
            ->paginate(12, ['*'], 'requests_page')
            ->withQueryString();

        $billedQuery = $this->billedQuery($from, $to);
        $billedRevenue = round((float) (clone $billedQuery)->sum('total'), 2);
        $billedCount = (clone $billedQuery)->count();

        $periodRequests = ServiceRequest::query()
            ->whereDate('requested_at', '>=', $from->toDateString())
            ->whereDate('requested_at', '<=', $to->toDateString())
            ->where('status', '!=', ServiceRequest::ANULADO);

        return Inertia::render('Services/Index', [
            'currency' => $currency,
            'timezone' => $timezone,
            'period' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
            ],
            'kpis' => [
                'activeServices' => Service::query()->where('active', true)->count(),
                'requested' => (clone $periodRequests)->count(),
                'open' => ServiceRequest::query()
                    ->whereIn('status', ServiceRequest::OPEN_STATUSES)
                    ->count(),
                'readyToBill' => ServiceRequest::query()
                    ->where('status', ServiceRequest::COMPLETADO)
                    ->count(),
                'billedRevenue' => $billedRevenue,
                'billedCount' => $billedCount,
                'averageTicket' => $billedCount > 0
                    ? round($billedRevenue / $billedCount, 2)
                    : 0.0,
                'topServices' => $this->topServices($from, $to),
            ],
            'services' => $services,
            'requests' => $requests,
            'readyRequests' => ServiceRequest::query()
                ->with([
                    'service:id,name,category',
                    'client:id,first_name,last_name',
                    'reservation:id,room_id',
                    'reservation.room:id,name',
                ])
                ->where('status', ServiceRequest::COMPLETADO)
                ->latest('requested_at')
                ->latest('id')
                ->limit(8)
                ->get(),
            'recentRequests' => ServiceRequest::query()
                ->with([
                    'service:id,name,category',
                    'client:id,first_name,last_name',
                    'reservation:id,room_id',
                    'reservation.room:id,name',
                    'bill:id,number,status,active',
                ])
                ->whereDate('requested_at', '>=', $from->toDateString())
                ->whereDate('requested_at', '<=', $to->toDateString())
                ->latest('requested_at')
                ->latest('id')
                ->limit(8)
                ->get(),
            'servicesForRequest' => Service::query()
                ->where('active', true)
                ->orderBy('name')
                ->limit(300)
                ->get(['id', 'name', 'category', 'price']),
            'clientsForRequest' => Client::query()
                ->where('active', true)
                ->orderBy('first_name')
                ->limit(300)
                ->get(['id', 'first_name', 'last_name', 'cedula']),
            'reservationsForRequest' => Reservation::query()
                ->with(['client:id,first_name,last_name', 'room:id,name'])
                ->whereIn('status', ['Pendiente', 'Confirmada', 'En curso'])
                ->latest('reserved_at')
                ->limit(200)
                ->get(['id', 'client_id', 'room_id', 'status', 'reserved_at']),
            'openBills' => Bill::query()
                ->with('client:id,first_name,last_name')
                ->where('active', true)
                ->where('status', 'Pendiente')
                ->whereDoesntHave('payments', fn (Builder $query) => $query->where('status', 'registrado'))
                ->latest('issued_at')
                ->latest('id')
                ->limit(200)
                ->get(['id', 'client_id', 'number', 'total', 'issued_at']),
            'filters' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'search' => $search,
                'category' => $category,
                'service_state' => $serviceState,
                'request_state' => $requestState,
                'tab' => $tab,
            ],
            'options' => [
                'categories' => Service::CATEGORIES,
                'requestStatuses' => ServiceRequest::STATUSES,
                'serviceStates' => self::SERVICE_STATES,
            ],
            'permissions' => [
                'manage' => $request->user()?->can(Permission::ServicesManage->value) ?? false,
                'bill' => $request->user()?->can(Permission::ServicesBill->value) ?? false,
            ],
        ]);
    }

    public function storeService(Request $request, ServiceDeskService $service): RedirectResponse
    {
        $this->authorize(Permission::ServicesManage->value);

        $validated = $request->validate($this->serviceRules(), [
            'name.required' => 'Indica el nombre del servicio.',
        ]);

        $service->createService($validated, $request->user());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Servicio creado correctamente.',
        ]);

        return back();
    }

    public function updateService(
        Request $request,
        Service $service,
        ServiceDeskService $serviceDesk,
    ): RedirectResponse {
        $this->authorize(Permission::ServicesManage->value);

        $validated = $request->validate($this->serviceRules($service));

        $serviceDesk->updateService($service, $validated, $request->user());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Servicio actualizado correctamente.',
        ]);

        return back();
    }

    public function storeRequest(Request $request, ServiceDeskService $service): RedirectResponse
    {
        $this->authorize(Permission::ServicesManage->value);

        $hotelId = app(CurrentHotel::class)->id();

        $validated = $request->validate([
            'service_id' => [
                'required',
                Rule::exists('services', 'id')->where('hotel_id', $hotelId),
            ],
            'client_id' => [
                'required',
                Rule::exists('clients', 'id')->where('hotel_id', $hotelId),
            ],
            'reservation_id' => [
                'nullable',
                Rule::exists('reservations', 'id')->where('hotel_id', $hotelId),
            ],
            'quantity' => ['required', 'integer', 'min:1', 'max:999'],
            'unit_price' => ['nullable', 'numeric', 'min:0', 'max:9999999'],
            'requested_at' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'idempotency_key' => ['nullable', 'string', 'max:64'],
        ], [
            'quantity.required' => 'Indica la cantidad solicitada.',
            'service_id.required' => 'Selecciona el servicio.',
            'client_id.required' => 'Selecciona el huésped o cliente.',
        ]);

        $service->createRequest($validated, $request->user());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Solicitud de servicio registrada.',
        ]);

        return back();
    }

    public function changeRequestStatus(
        Request $request,
        ServiceRequest $serviceRequest,
        ServiceDeskService $service,
    ): RedirectResponse {
        $this->authorize(Permission::ServicesManage->value);

        $validated = $request->validate([
            'status' => ['required', Rule::in([
                ServiceRequest::EN_PROCESO,
                ServiceRequest::COMPLETADO,
            ])],
        ]);

        $service->changeStatus($serviceRequest, $validated['status'], $request->user());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Estado de la solicitud actualizado.',
        ]);

        return back();
    }

    public function voidRequest(
        Request $request,
        ServiceRequest $serviceRequest,
        ServiceDeskService $service,
    ): RedirectResponse {
        $this->authorize(Permission::ServicesManage->value);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $service->voidRequest($serviceRequest, $request->user(), $validated['reason']);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Solicitud anulada con su motivo en la bitácora.',
        ]);

        return back();
    }

    public function billRequest(
        Request $request,
        ServiceRequest $serviceRequest,
        ServiceDeskService $service,
    ): RedirectResponse {
        $this->authorize(Permission::ServicesBill->value);

        $hotelId = app(CurrentHotel::class)->id();

        $validated = $request->validate([
            'bill_id' => [
                'nullable',
                Rule::exists('bills', 'id')->where('hotel_id', $hotelId),
            ],
        ]);

        $billId = $validated['bill_id'] ?? null;

        $service->billRequest(
            $serviceRequest,
            $request->user(),
            $billId === null ? null : (int) $billId,
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Servicio facturado correctamente.',
        ]);

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    private function serviceRules(?Service $service = null): array
    {
        $hotelId = app(CurrentHotel::class)->id();

        return [
            'name' => [
                'required',
                'string',
                'max:120',
                Rule::unique('services', 'name')
                    ->where(fn ($query) => $query->where('hotel_id', $hotelId))
                    ->ignore($service?->id),
            ],
            'category' => ['required', Rule::in(Service::CATEGORIES)],
            'description' => ['nullable', 'string', 'max:1000'],
            'price' => ['nullable', 'numeric', 'min:0', 'max:9999999'],
            'active' => ['boolean'],
        ];
    }

    /**
     * @return Builder<Service>
     */
    private function servicesQuery(
        string $search,
        string $category,
        string $state,
    ): Builder {
        return Service::query()
            ->when(
                $category !== '',
                fn (Builder $query) => $query->where('category', $category),
            )
            ->when(
                $state !== '',
                fn (Builder $query) => $query->where('active', $state === 'activo'),
            )
            ->when($search !== '', function (Builder $query) use ($search): void {
                $query->where(function (Builder $query) use ($search): void {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhere('category', 'like', "%{$search}%");
                });
            });
    }

    /**
     * @return Builder<ServiceRequest>
     */
    private function requestsQuery(
        CarbonImmutable $from,
        CarbonImmutable $to,
        string $search,
        string $state,
    ): Builder {
        return ServiceRequest::query()
            ->with([
                'service:id,name,category',
                'client:id,first_name,last_name,cedula',
                'reservation:id,room_id',
                'reservation.room:id,name',
                'bill:id,number,status,active',
                'createdBy:id,name',
                'billedBy:id,name',
                'voidedBy:id,name',
            ])
            ->whereDate('requested_at', '>=', $from->toDateString())
            ->whereDate('requested_at', '<=', $to->toDateString())
            ->when(
                $state !== '',
                fn (Builder $query) => $query->where('status', $state),
            )
            ->when($search !== '', function (Builder $query) use ($search): void {
                $query->where(function (Builder $query) use ($search): void {
                    $query->where('notes', 'like', "%{$search}%")
                        ->orWhereHas('service', fn (Builder $service) => $service
                            ->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('client', fn (Builder $client) => $client
                            ->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('cedula', 'like', "%{$search}%"))
                        ->orWhereHas('bill', fn (Builder $bill) => $bill
                            ->where('number', 'like', "%{$search}%"));
                });
            });
    }

    /**
     * Invoiced service requests of the period whose invoice is still valid.
     *
     * @return Builder<ServiceRequest>
     */
    private function billedQuery(CarbonImmutable $from, CarbonImmutable $to): Builder
    {
        return ServiceRequest::query()
            ->where('status', ServiceRequest::FACTURADO)
            ->whereDate('requested_at', '>=', $from->toDateString())
            ->whereDate('requested_at', '<=', $to->toDateString())
            ->whereHas('bill', fn (Builder $bill) => $bill
                ->where('active', true)
                ->where('status', '!=', 'Anulada'));
    }

    /**
     * Best-selling services of the period, grouped in PHP to stay portable.
     *
     * @return list<array{service: string, quantity: int, total: float}>
     */
    private function topServices(CarbonImmutable $from, CarbonImmutable $to): array
    {
        return $this->billedQuery($from, $to)
            ->with('service:id,name')
            ->get(['id', 'service_id', 'quantity', 'total'])
            ->groupBy('service_id')
            ->map(function ($group): array {
                return [
                    'service' => $group->first()->service?->name ?? 'Servicio',
                    'quantity' => (int) $group->sum('quantity'),
                    'total' => round((float) $group->sum('total'), 2),
                ];
            })
            ->sortByDesc('total')
            ->take(5)
            ->values()
            ->all();
    }

    /**
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    private function resolvePeriod(Request $request, string $timezone): array
    {
        $now = CarbonImmutable::now($timezone);
        $from = $this->parseDate($request->input('from'), $timezone)
            ?? $now->copy()->startOfMonth();
        $to = $this->parseDate($request->input('to'), $timezone)
            ?? $now;

        if ($from->greaterThan($to)) {
            [$from, $to] = [$to, $from];
        }

        return [$from->startOfDay(), $to->startOfDay()];
    }

    private function parseDate(mixed $value, string $timezone): ?CarbonImmutable
    {
        if (! is_string($value) || ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return null;
        }

        $date = CarbonImmutable::createFromFormat('!Y-m-d', $value, $timezone);

        return $date === false ? null : $date->startOfDay();
    }

    /**
     * @param  list<string>  $allowed
     */
    private function filterValue(Request $request, string $key, array $allowed): string
    {
        $value = (string) $request->input($key, '');

        return in_array($value, $allowed, true) ? $value : '';
    }
}
