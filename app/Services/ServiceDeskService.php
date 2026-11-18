<?php

namespace App\Services;

use App\Models\Bill;
use App\Models\BillDetail;
use App\Models\Reservation;
use App\Models\Service;
use App\Models\ServiceRequest;
use App\Models\User;
use App\Support\CurrentHotel;
use App\Support\HotelConfig;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Service desk operations that must stay consistent across the catalog, the
 * requests and the invoices.
 *
 * Rules enforced here (never only in the frontend):
 * - every write runs inside a transaction and locks the affected rows;
 * - prices and totals are always recomputed on the server;
 * - a request is billed only once and only after it is completed;
 * - only bills without registered collections receive new service lines;
 * - history is never deleted: requests are voided with a reason.
 */
class ServiceDeskService
{
    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * @param  array{name: string, category: string, description?: ?string, price?: float|string, active?: bool}  $data
     */
    public function createService(array $data, User $user): Service
    {
        return DB::transaction(function () use ($data): Service {
            $service = Service::create([
                'name' => trim($data['name']),
                'category' => $data['category'],
                'description' => $this->cleanText($data['description'] ?? null),
                'price' => round((float) ($data['price'] ?? 0), 2),
                'active' => $data['active'] ?? true,
            ]);

            $this->audit->record(
                module: 'services',
                action: 'service_created',
                subject: $service,
                description: "Servicio creado: {$service->name}",
                changes: [
                    'name' => $service->name,
                    'category' => $service->category,
                    'price' => (float) $service->price,
                    'active' => (bool) $service->active,
                ],
            );

            return $service->refresh();
        });
    }

    /**
     * @param  array{name: string, category: string, description?: ?string, price?: float|string, active?: bool}  $data
     */
    public function updateService(Service $service, array $data, User $user): Service
    {
        return DB::transaction(function () use ($service, $data): Service {
            $service = Service::query()->lockForUpdate()->findOrFail((int) $service->getKey());

            // Capture the previous state before save() because getOriginal()
            // returns the new values once the model has been persisted.
            $before = [
                'name' => $service->name,
                'category' => $service->category,
                'description' => $service->description,
                'price' => (float) $service->price,
                'active' => (bool) $service->active,
            ];

            $service->fill([
                'name' => trim($data['name']),
                'category' => $data['category'],
                'description' => $this->cleanText($data['description'] ?? null),
                'price' => round((float) ($data['price'] ?? 0), 2),
                'active' => $data['active'] ?? $service->active,
            ])->save();

            $this->audit->record(
                module: 'services',
                action: 'service_updated',
                subject: $service,
                description: "Servicio actualizado: {$service->name}",
                changes: [
                    'before' => $before,
                    'after' => [
                        'name' => $service->name,
                        'category' => $service->category,
                        'description' => $service->description,
                        'price' => (float) $service->price,
                        'active' => (bool) $service->active,
                    ],
                ],
            );

            return $service->refresh();
        });
    }

    /**
     * Register a service request for a guest.
     *
     * @param  array{service_id: int, client_id: int, reservation_id?: ?int, quantity: int, unit_price?: float|string|null, requested_at: string, notes?: ?string, idempotency_key?: ?string}  $data
     */
    public function createRequest(array $data, User $user): ServiceRequest
    {
        return DB::transaction(function () use ($data, $user): ServiceRequest {
            $service = Service::query()->findOrFail((int) $data['service_id']);

            if (! $service->active) {
                throw ValidationException::withMessages([
                    'service_id' => 'El servicio está inactivo y no acepta solicitudes.',
                ]);
            }

            $quantity = (int) $data['quantity'];
            $unitPrice = round((float) ($data['unit_price'] ?? $service->price), 2);
            $key = $this->normalizeKey($data['idempotency_key'] ?? null);

            // When the request is tied to a reservation, the reservation's
            // guest owns the charge regardless of the submitted client.
            $clientId = (int) $data['client_id'];

            if (($data['reservation_id'] ?? null) !== null) {
                $reservation = Reservation::query()
                    ->findOrFail((int) $data['reservation_id']);

                $clientId = (int) $reservation->client_id;
            }

            if ($key !== null) {
                $existing = ServiceRequest::query()
                    ->where('idempotency_key', $key)
                    ->first();

                if ($existing !== null) {
                    $sameRequest = (int) $existing->service_id === (int) $service->id
                        && (int) $existing->client_id === $clientId
                        && (int) $existing->quantity === $quantity
                        && abs((float) $existing->unit_price - $unitPrice) < 0.005;

                    if (! $sameRequest) {
                        throw ValidationException::withMessages([
                            'idempotency_key' => 'La clave de idempotencia ya fue usada con otros datos.',
                        ]);
                    }

                    return $existing;
                }
            }

            $request = ServiceRequest::create([
                'service_id' => $service->id,
                'client_id' => $clientId,
                'reservation_id' => $data['reservation_id'] ?? null,
                'status' => ServiceRequest::PENDIENTE,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'total' => round($quantity * $unitPrice, 2),
                'requested_at' => $data['requested_at'],
                'notes' => $this->cleanText($data['notes'] ?? null, 1000),
                'idempotency_key' => $key,
                'created_by' => $user->id,
            ]);

            $this->audit->record(
                module: 'services',
                action: 'request_created',
                subject: $request,
                description: "Solicitud de servicio creada: {$service->name}",
                changes: [
                    'service_id' => $service->id,
                    'client_id' => $request->client_id,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'total' => (float) $request->total,
                    'requested_at' => $request->requested_at->toDateString(),
                ],
            );

            return $request->refresh();
        });
    }

    /**
     * Move a request forward in its lifecycle.
     */
    public function changeStatus(ServiceRequest $request, string $status, User $user): ServiceRequest
    {
        return DB::transaction(function () use ($request, $status): ServiceRequest {
            $request = ServiceRequest::query()->lockForUpdate()->findOrFail((int) $request->getKey());
            $previous = $request->status;

            if (! in_array($status, [ServiceRequest::EN_PROCESO, ServiceRequest::COMPLETADO], true)) {
                throw ValidationException::withMessages([
                    'status' => 'Transición de estado no permitida.',
                ]);
            }

            if ($previous === ServiceRequest::FACTURADO || $previous === ServiceRequest::ANULADO) {
                throw ValidationException::withMessages([
                    'status' => 'Una solicitud facturada o anulada no cambia de estado.',
                ]);
            }

            if ($status === ServiceRequest::EN_PROCESO && $previous !== ServiceRequest::PENDIENTE) {
                throw ValidationException::withMessages([
                    'status' => 'Solo una solicitud pendiente puede pasar a en proceso.',
                ]);
            }

            if ($status === ServiceRequest::COMPLETADO && ! $request->isOpen()) {
                throw ValidationException::withMessages([
                    'status' => 'Solo una solicitud abierta puede marcarse como completada.',
                ]);
            }

            $request->forceFill([
                'status' => $status,
                'completed_at' => $status === ServiceRequest::COMPLETADO
                    ? $this->today()
                    : null,
            ])->save();

            $this->audit->record(
                module: 'services',
                action: 'request_status_changed',
                subject: $request,
                description: "Solicitud #{$request->id} pasó de {$previous} a {$status}",
                changes: [
                    'status' => ['before' => $previous, 'after' => $status],
                ],
            );

            return $request->refresh();
        });
    }

    /**
     * Cancel a request that has not been invoiced yet.
     */
    public function voidRequest(ServiceRequest $request, User $user, string $reason): ServiceRequest
    {
        return DB::transaction(function () use ($request, $user, $reason): ServiceRequest {
            $request = ServiceRequest::query()->lockForUpdate()->findOrFail((int) $request->getKey());

            if ($request->status === ServiceRequest::ANULADO) {
                throw ValidationException::withMessages([
                    'request' => 'La solicitud ya está anulada.',
                ]);
            }

            $reason = trim($reason);

            if ($reason === '') {
                throw ValidationException::withMessages([
                    'reason' => 'Indica el motivo de la anulación.',
                ]);
            }

            if ($request->status === ServiceRequest::FACTURADO && $request->bill_id !== null) {
                $bill = Bill::query()->find($request->bill_id);

                if ($bill !== null && $bill->active && $bill->status !== 'Anulada') {
                    throw ValidationException::withMessages([
                        'request' => 'La solicitud ya está facturada. Anula primero la factura '.$bill->number.' en Finanzas.',
                    ]);
                }
            }

            $previous = $request->status;

            $request->forceFill([
                'status' => ServiceRequest::ANULADO,
                'voided_by' => $user->id,
                'voided_at' => now(),
                'void_reason' => $reason,
            ])->save();

            $this->audit->record(
                module: 'services',
                action: 'request_voided',
                subject: $request,
                description: "Solicitud de servicio #{$request->id} anulada",
                changes: [
                    'status' => ['before' => $previous, 'after' => ServiceRequest::ANULADO],
                    'bill_id' => $request->bill_id,
                    'reason' => $reason,
                ],
            );

            return $request->refresh();
        });
    }

    /**
     * Invoice a completed request.
     *
     * Without a `bill_id` a new invoice is generated. With a `bill_id` the line
     * is appended to an open invoice of the same client that has no registered
     * collections, so totals and status stay coherent.
     */
    public function billRequest(ServiceRequest $request, User $user, ?int $billId = null): ServiceRequest
    {
        return DB::transaction(function () use ($request, $user, $billId): ServiceRequest {
            $request = ServiceRequest::query()->lockForUpdate()->findOrFail((int) $request->getKey());

            if ($request->status === ServiceRequest::FACTURADO) {
                throw ValidationException::withMessages([
                    'request' => 'La solicitud ya fue facturada.',
                ]);
            }

            if ($request->status === ServiceRequest::ANULADO) {
                throw ValidationException::withMessages([
                    'request' => 'Una solicitud anulada no se puede facturar.',
                ]);
            }

            if (! $request->isBillable()) {
                throw ValidationException::withMessages([
                    'request' => 'Completa la solicitud antes de facturarla.',
                ]);
            }

            if ($request->client_id === null) {
                throw ValidationException::withMessages([
                    'request' => 'La solicitud necesita un cliente para facturarse.',
                ]);
            }

            $service = Service::query()->findOrFail($request->service_id);
            $lineTotal = round((int) $request->quantity * (float) $request->unit_price, 2);

            if ($lineTotal <= 0) {
                throw ValidationException::withMessages([
                    'request' => 'El monto del servicio debe ser mayor que cero.',
                ]);
            }

            $bill = $billId === null
                ? $this->createBill($request, $lineTotal, $user)
                : $this->appendToBill($request, $billId, $lineTotal);

            $detail = BillDetail::create([
                'bill_id' => $bill->id,
                'description' => $service->name,
                'quantity' => (int) $request->quantity,
                'unit_price' => (float) $request->unit_price,
                'subtotal' => $lineTotal,
            ]);

            $request->forceFill([
                'status' => ServiceRequest::FACTURADO,
                'bill_id' => $bill->id,
                'bill_detail_id' => $detail->id,
                'billed_at' => now(),
                'billed_by' => $user->id,
            ])->save();

            $this->audit->record(
                module: 'services',
                action: 'request_billed',
                subject: $request,
                description: "Solicitud #{$request->id} facturada en {$bill->number}",
                changes: [
                    'bill_id' => $bill->id,
                    'bill_number' => $bill->number,
                    'bill_detail_id' => $detail->id,
                    'total' => $lineTotal,
                ],
            );

            return $request->refresh();
        });
    }

    private function createBill(ServiceRequest $request, float $lineTotal, User $user): Bill
    {
        // Taxes apply only to new invoices. Historical bills keep the rate
        // they were issued with, because their totals are stored rows.
        $taxRate = HotelConfig::current()['tax_rate'];
        $tax = round($lineTotal * $taxRate / 100, 2);

        return Bill::create([
            'hotel_id' => app(CurrentHotel::class)->id(),
            'client_id' => $request->client_id,
            'reservation_id' => $request->reservation_id,
            'number' => $this->nextBillNumber(),
            'issued_at' => $this->today(),
            'subtotal' => $lineTotal,
            'tax' => $tax,
            'total' => round($lineTotal + $tax, 2),
            'status' => 'Pendiente',
            'notes' => "Generada desde Servicios · solicitud #{$request->id}",
            'active' => true,
        ]);
    }

    private function appendToBill(ServiceRequest $request, int $billId, float $lineTotal): Bill
    {
        $bill = Bill::query()->lockForUpdate()->findOrFail($billId);

        if (! $bill->active || $bill->status !== 'Pendiente') {
            throw ValidationException::withMessages([
                'bill_id' => 'Solo se pueden agregar servicios a facturas pendientes y activas.',
            ]);
        }

        if ((int) $bill->client_id !== (int) $request->client_id) {
            throw ValidationException::withMessages([
                'bill_id' => 'La factura pertenece a otro cliente.',
            ]);
        }

        $paid = round((float) $bill->payments()->where('status', 'registrado')->sum('amount'), 2);

        if ($paid > 0) {
            throw ValidationException::withMessages([
                'bill_id' => 'La factura tiene cobros registrados; no admite nuevas líneas.',
            ]);
        }

        $subtotal = round((float) $bill->subtotal + $lineTotal, 2);

        $bill->forceFill([
            'subtotal' => $subtotal,
            'total' => round($subtotal + (float) $bill->tax, 2),
            'status' => 'Pendiente',
        ])->save();

        return $bill;
    }

    /**
     * Readable invoice number, unique per hotel. A random suffix avoids
     * collisions without relying on an unlocked sequence.
     */
    private function nextBillNumber(): string
    {
        $invoicePrefix = HotelConfig::current()['invoice_prefix'];
        $prefix = $invoicePrefix.'-'.now($this->timezone())->format('Ymd').'-';

        for ($attempt = 0; $attempt < 10; $attempt++) {
            $number = $prefix.Str::upper(Str::random(6));

            if (! Bill::query()->where('number', $number)->exists()) {
                return $number;
            }
        }

        throw ValidationException::withMessages([
            'bill_id' => 'No se pudo generar un número de factura único. Intenta de nuevo.',
        ]);
    }

    private function cleanText(mixed $value, int $limit = 1000): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = trim($value);

        return $value === '' ? null : mb_substr($value, 0, $limit);
    }

    private function normalizeKey(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = trim($value);

        return $value === '' ? null : mb_substr($value, 0, 64);
    }

    private function today(): string
    {
        return now($this->timezone())->toDateString();
    }

    private function timezone(): string
    {
        return app(CurrentHotel::class)->timezone();
    }
}
