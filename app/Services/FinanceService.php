<?php

namespace App\Services;

use App\Models\Bill;
use App\Models\Expense;
use App\Models\FinanceMovement;
use App\Models\Payment;
use App\Models\User;
use App\Support\CurrentHotel;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Financial operations that must stay consistent across several tables.
 *
 * Rules enforced here (never only in the frontend):
 * - every write runs inside a transaction and locks the affected invoice;
 * - a payment can never exceed the invoice balance;
 * - voiding never deletes history: it creates a reversal movement;
 * - invoices with registered payments cannot be voided;
 * - an idempotency key prevents the same payment/expense twice.
 */
class FinanceService
{
    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * Register a collection against an invoice.
     *
     * @param  array{bill_id: int, method: string, amount: float|string, paid_at: string, reference?: ?string, notes?: ?string, idempotency_key?: ?string}  $data
     */
    public function registerPayment(array $data, User $user): Payment
    {
        return DB::transaction(function () use ($data, $user): Payment {
            $bill = $this->lockBill((int) $data['bill_id']);
            $amount = round((float) $data['amount'], 2);
            $key = $this->normalizeKey($data['idempotency_key'] ?? null);

            if ($key !== null) {
                $existing = Payment::query()->where('idempotency_key', $key)->first();

                if ($existing !== null) {
                    $sameBill = (int) $existing->bill_id === (int) $bill->id;
                    $sameAmount = abs((float) $existing->amount - $amount) < 0.005;

                    if (! $sameBill || ! $sameAmount) {
                        throw ValidationException::withMessages([
                            'idempotency_key' => 'La clave de idempotencia ya fue usada con otros datos.',
                        ]);
                    }

                    return $existing;
                }
            }

            $this->assertBillAcceptsPayments($bill);

            if ($amount <= 0) {
                throw ValidationException::withMessages([
                    'amount' => 'El monto del cobro debe ser mayor que cero.',
                ]);
            }

            $paid = $this->paidTotal($bill);
            $balance = round((float) $bill->total - $paid, 2);

            if ($amount > $balance + 0.005) {
                throw ValidationException::withMessages([
                    'amount' => 'El monto excede el balance pendiente de la factura ('.number_format($balance, 2).').',
                ]);
            }

            $payment = Payment::create([
                'hotel_id' => $bill->hotel_id,
                'bill_id' => $bill->id,
                'client_id' => $bill->client_id,
                'method' => $data['method'],
                'amount' => $amount,
                'paid_at' => $data['paid_at'],
                'reference' => $data['reference'] ?? null,
                'notes' => $data['notes'] ?? null,
                'status' => 'registrado',
                'idempotency_key' => $key,
                'created_by' => $user->id,
            ]);

            $this->recordMovement(
                direction: FinanceMovement::INGRESO,
                amount: $amount,
                description: "Cobro de la factura {$bill->number}",
                source: $payment,
                occurredAt: $this->hotelNoon($payment->paid_at->toDateString()),
                userId: $user->id,
            );

            $this->refreshBillStatus($bill);

            $this->audit->record(
                module: 'finance',
                action: 'payment_registered',
                subject: $payment,
                description: "Cobro registrado para la factura {$bill->number}",
                changes: [
                    'bill_id' => $bill->id,
                    'amount' => $amount,
                    'method' => $payment->method,
                    'paid_at' => $payment->paid_at->toDateString(),
                ],
            );

            return $payment->refresh();
        });
    }

    /**
     * Void a collection through a reversal movement (history is preserved).
     */
    public function voidPayment(Payment $payment, User $user, string $reason): Payment
    {
        return DB::transaction(function () use ($payment, $user, $reason): Payment {
            $payment = Payment::query()->lockForUpdate()->findOrFail((int) $payment->getKey());

            if ($payment->status === 'anulado') {
                throw ValidationException::withMessages([
                    'payment' => 'El cobro ya está anulado.',
                ]);
            }

            $bill = $this->lockBill((int) $payment->bill_id);
            $reason = trim($reason);

            if ($reason === '') {
                throw ValidationException::withMessages([
                    'reason' => 'Indica el motivo de la anulación.',
                ]);
            }

            $payment->forceFill([
                'status' => 'anulado',
                'voided_by' => $user->id,
                'voided_at' => now(),
                'void_reason' => $reason,
            ])->save();

            $original = $this->originalMovement($payment);

            $this->recordMovement(
                direction: FinanceMovement::EGRESO,
                amount: (float) $payment->amount,
                description: "Reverso del cobro #{$payment->id} de la factura {$bill->number}",
                source: $payment,
                occurredAt: now(),
                userId: $user->id,
                reversalOfId: $original?->id,
            );

            $this->refreshBillStatus($bill);

            $this->audit->record(
                module: 'finance',
                action: 'payment_voided',
                subject: $payment,
                description: "Cobro #{$payment->id} anulado",
                changes: [
                    'bill_id' => $bill->id,
                    'amount' => (float) $payment->amount,
                    'reason' => $reason,
                ],
            );

            return $payment->refresh();
        });
    }

    /**
     * Register an operating expense and its ledger movement.
     *
     * @param  array{category: string, description: string, amount: float|string, expense_date: string, method: string, reference?: ?string, supplier?: ?string, idempotency_key?: ?string}  $data
     */
    public function registerExpense(array $data, User $user): Expense
    {
        return DB::transaction(function () use ($data, $user): Expense {
            $amount = round((float) $data['amount'], 2);
            $key = $this->normalizeKey($data['idempotency_key'] ?? null);

            if ($key !== null) {
                $existing = Expense::query()->where('idempotency_key', $key)->first();

                if ($existing !== null) {
                    $sameAmount = abs((float) $existing->amount - $amount) < 0.005;

                    if (! $sameAmount) {
                        throw ValidationException::withMessages([
                            'idempotency_key' => 'La clave de idempotencia ya fue usada con otros datos.',
                        ]);
                    }

                    return $existing;
                }
            }

            if ($amount <= 0) {
                throw ValidationException::withMessages([
                    'amount' => 'El monto del gasto debe ser mayor que cero.',
                ]);
            }

            $expense = Expense::create([
                'hotel_id' => app(CurrentHotel::class)->id(),
                'category' => $data['category'],
                'description' => $data['description'],
                'amount' => $amount,
                'expense_date' => $data['expense_date'],
                'method' => $data['method'],
                'reference' => $data['reference'] ?? null,
                'supplier' => $data['supplier'] ?? null,
                'status' => 'registrado',
                'idempotency_key' => $key,
                'created_by' => $user->id,
            ]);

            $this->recordMovement(
                direction: FinanceMovement::EGRESO,
                amount: $amount,
                description: "Gasto: {$expense->description}",
                source: $expense,
                occurredAt: $this->hotelNoon($expense->expense_date->toDateString()),
                userId: $user->id,
            );

            $this->audit->record(
                module: 'finance',
                action: 'expense_registered',
                subject: $expense,
                description: "Gasto registrado: {$expense->description}",
                changes: [
                    'category' => $expense->category,
                    'amount' => $amount,
                    'expense_date' => $expense->expense_date->toDateString(),
                ],
            );

            return $expense->refresh();
        });
    }

    /**
     * Void an expense through a reversal movement.
     */
    public function voidExpense(Expense $expense, User $user, string $reason): Expense
    {
        return DB::transaction(function () use ($expense, $user, $reason): Expense {
            $expense = Expense::query()->lockForUpdate()->findOrFail((int) $expense->getKey());

            if ($expense->status === 'anulado') {
                throw ValidationException::withMessages([
                    'expense' => 'El gasto ya está anulado.',
                ]);
            }

            $reason = trim($reason);

            if ($reason === '') {
                throw ValidationException::withMessages([
                    'reason' => 'Indica el motivo de la anulación.',
                ]);
            }

            $expense->forceFill([
                'status' => 'anulado',
                'voided_by' => $user->id,
                'voided_at' => now(),
                'void_reason' => $reason,
            ])->save();

            $original = $this->originalMovement($expense);

            $this->recordMovement(
                direction: FinanceMovement::INGRESO,
                amount: (float) $expense->amount,
                description: "Reverso del gasto #{$expense->id}",
                source: $expense,
                occurredAt: now(),
                userId: $user->id,
                reversalOfId: $original?->id,
            );

            $this->audit->record(
                module: 'finance',
                action: 'expense_voided',
                subject: $expense,
                description: "Gasto #{$expense->id} anulado",
                changes: [
                    'amount' => (float) $expense->amount,
                    'reason' => $reason,
                ],
            );

            return $expense->refresh();
        });
    }

    /**
     * Void an invoice only when it has no registered collections.
     */
    public function voidBill(Bill $bill, User $user, string $reason): Bill
    {
        return DB::transaction(function () use ($bill, $user, $reason): Bill {
            $bill = $this->lockBill((int) $bill->getKey());

            if ($bill->status === 'Anulada') {
                throw ValidationException::withMessages([
                    'bill' => 'La factura ya está anulada.',
                ]);
            }

            $registered = $this->paidTotal($bill);

            if ($registered > 0) {
                throw ValidationException::withMessages([
                    'bill' => 'La factura tiene cobros registrados. Anula primero los cobros antes de anularla.',
                ]);
            }

            $reason = trim($reason);

            if ($reason === '') {
                throw ValidationException::withMessages([
                    'reason' => 'Indica el motivo de la anulación.',
                ]);
            }

            $previousStatus = $bill->status;

            $bill->forceFill([
                'status' => 'Anulada',
                'active' => false,
                'voided_by' => $user->id,
                'voided_at' => now(),
                'void_reason' => $reason,
            ])->save();

            $this->audit->record(
                module: 'finance',
                action: 'bill_voided',
                subject: $bill,
                description: "Factura {$bill->number} anulada",
                changes: [
                    'status' => ['before' => $previousStatus, 'after' => 'Anulada'],
                    'total' => (float) $bill->total,
                    'reason' => $reason,
                ],
            );

            return $bill->refresh();
        });
    }

    private function lockBill(int $billId): Bill
    {
        return Bill::query()->lockForUpdate()->findOrFail($billId);
    }

    private function assertBillAcceptsPayments(Bill $bill): void
    {
        if (! $bill->active || $bill->status === 'Anulada') {
            throw ValidationException::withMessages([
                'bill_id' => 'La factura está anulada o inactiva y no acepta cobros.',
            ]);
        }
    }

    private function paidTotal(Bill $bill): float
    {
        return round((float) $bill->payments()
            ->where('status', 'registrado')
            ->sum('amount'), 2);
    }

    private function refreshBillStatus(Bill $bill): void
    {
        if (! $bill->active || $bill->status === 'Anulada') {
            return;
        }

        $paid = $this->paidTotal($bill);
        $status = $paid + 0.005 >= (float) $bill->total ? 'Pagada' : 'Pendiente';

        if ($bill->status !== $status) {
            $bill->forceFill(['status' => $status])->save();
        }
    }

    private function originalMovement(Payment|Expense $source): ?FinanceMovement
    {
        return FinanceMovement::query()
            ->where('source_type', $source->getMorphClass())
            ->where('source_id', $source->getKey())
            ->whereDoesntHave('reversals')
            ->latest('id')
            ->first();
    }

    private function recordMovement(
        string $direction,
        float $amount,
        string $description,
        Payment|Expense $source,
        CarbonImmutable $occurredAt,
        int $userId,
        ?int $reversalOfId = null,
    ): FinanceMovement {
        return FinanceMovement::create([
            'hotel_id' => app(CurrentHotel::class)->id(),
            'direction' => $direction,
            'amount' => $amount,
            'description' => $description,
            'source_type' => $source->getMorphClass(),
            'source_id' => $source->getKey(),
            'occurred_at' => $occurredAt,
            'reversal_of_id' => $reversalOfId,
            'created_by' => $userId,
        ]);
    }

    /**
     * Ledger timestamps keep the business date in the hotel timezone.
     */
    private function hotelNoon(string $date): CarbonImmutable
    {
        $timezone = app(CurrentHotel::class)->timezone();

        return CarbonImmutable::parse("{$date} 12:00:00", $timezone)->utc();
    }

    private function normalizeKey(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = trim($value);

        return $value === '' ? null : mb_substr($value, 0, 64);
    }
}
