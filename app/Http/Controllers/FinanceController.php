<?php

namespace App\Http\Controllers;

use App\Models\Bill;
use App\Models\Expense;
use App\Models\FinanceMovement;
use App\Models\Payment;
use App\Services\FinanceService;
use App\Support\CurrentHotel;
use App\Support\Permission;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FinanceController extends Controller
{
    /**
     * @var list<string>
     */
    private const BILL_STATUSES = ['Pendiente', 'Pagada', 'Anulada'];

    /**
     * Spanish short month labels for the six-month series.
     *
     * @var list<string>
     */
    private const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

    /**
     * Finance operations center: invoicing, collections, expenses and the
     * append-only cash ledger, scoped to the current hotel and period.
     */
    public function index(Request $request): Response
    {
        $this->authorize(Permission::FinanceView->value);

        $hotel = app(CurrentHotel::class)->model();
        $timezone = app(CurrentHotel::class)->timezone();
        $currency = app(CurrentHotel::class)->currency();

        [$from, $to] = $this->resolvePeriod($request, $timezone);
        $periodDays = (int) $from->diffInDays($to) + 1;
        $previousFrom = $from->copy()->subDays($periodDays);
        $previousTo = $from->copy()->subDay();

        $search = trim((string) $request->input('search', ''));
        $billState = $this->filterValue($request, 'bill_state', self::BILL_STATUSES);
        $paymentState = $this->filterValue($request, 'payment_state', Payment::STATUSES);
        $paymentMethod = $this->filterValue($request, 'payment_method', Payment::METHODS);
        $expenseState = $this->filterValue($request, 'expense_state', Expense::STATUSES);
        $expenseCategory = $this->filterValue($request, 'expense_category', Expense::CATEGORIES);
        $movementDirection = $this->filterValue($request, 'movement_direction', FinanceMovement::DIRECTIONS);
        $tab = (string) $request->input('tab', 'resumen');
        $tab = in_array($tab, ['resumen', 'facturas', 'cobros', 'gastos', 'movimientos'], true)
            ? $tab
            : 'resumen';

        $bills = $this->billsQuery($from, $to, $search, $billState)
            ->latest('issued_at')
            ->latest('id')
            ->paginate(10, ['*'], 'bills_page')
            ->withQueryString();

        $payments = $this->paymentsQuery($from, $to, $search, $paymentMethod, $paymentState)
            ->latest('paid_at')
            ->latest('id')
            ->paginate(10, ['*'], 'payments_page')
            ->withQueryString();

        $expenses = $this->expensesQuery($from, $to, $search, $expenseCategory, $expenseState)
            ->latest('expense_date')
            ->latest('id')
            ->paginate(10, ['*'], 'expenses_page')
            ->withQueryString();

        $movements = $this->movementsQuery($from, $to, $search, $movementDirection)
            ->latest('occurred_at')
            ->latest('id')
            ->paginate(12, ['*'], 'movements_page')
            ->withQueryString();

        $current = $this->periodTotals($from, $to);
        $previous = $this->periodTotals($previousFrom, $previousTo);

        return Inertia::render('Finance/Index', [
            'currency' => $currency,
            'timezone' => $timezone,
            'period' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'days' => $periodDays,
            ],
            'kpis' => [
                ...$current,
                'pending' => $this->pendingReceivable($to),
                'change' => [
                    'invoiced' => $this->percentChange($current['invoiced'], $previous['invoiced']),
                    'collected' => $this->percentChange($current['collected'], $previous['collected']),
                    'expenses' => $this->percentChange($current['expenses'], $previous['expenses']),
                    'net' => $this->percentChange($current['net'], $previous['net']),
                ],
            ],
            'previous' => $previous,
            'series' => $this->monthlySeries($to),
            'bills' => $bills,
            'payments' => $payments,
            'expenses' => $expenses,
            'movements' => $movements,
            'payableBills' => $this->payableBills(),
            'filters' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'search' => $search,
                'bill_state' => $billState,
                'payment_state' => $paymentState,
                'payment_method' => $paymentMethod,
                'expense_state' => $expenseState,
                'expense_category' => $expenseCategory,
                'movement_direction' => $movementDirection,
                'tab' => $tab,
            ],
            'options' => [
                'billStatuses' => self::BILL_STATUSES,
                'paymentMethods' => Payment::METHODS,
                'paymentStatuses' => Payment::STATUSES,
                'expenseCategories' => Expense::CATEGORIES,
                'expenseMethods' => Expense::METHODS,
                'expenseStatuses' => Expense::STATUSES,
                'movementDirections' => FinanceMovement::DIRECTIONS,
            ],
            'permissions' => [
                'manage' => $request->user()?->can(Permission::FinanceManage->value) ?? false,
                'void' => $request->user()?->can(Permission::FinanceVoid->value) ?? false,
                'export' => $request->user()?->can(Permission::ReportsExport->value) ?? false,
            ],
        ]);
    }

    public function storePayment(Request $request, FinanceService $service): RedirectResponse
    {
        $this->authorize(Permission::FinanceManage->value);

        $hotelId = app(CurrentHotel::class)->id();

        $validated = $request->validate([
            'bill_id' => [
                'required',
                'integer',
                Rule::exists('bills', 'id')->where('hotel_id', $hotelId)->where('active', true),
            ],
            'method' => ['required', Rule::in(Payment::METHODS)],
            'amount' => ['required', 'numeric', 'min:0.01', 'max:999999999.99'],
            'paid_at' => ['required', 'date'],
            'reference' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'idempotency_key' => ['nullable', 'string', 'max:64'],
        ]);

        $service->registerPayment($validated, $request->user());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Cobro registrado correctamente.',
        ]);

        return back();
    }

    public function voidPayment(
        Request $request,
        Payment $payment,
        FinanceService $service,
    ): RedirectResponse {
        $this->authorize(Permission::FinanceVoid->value);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $service->voidPayment($payment, $request->user(), $validated['reason']);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Cobro anulado con su movimiento de reverso.',
        ]);

        return back();
    }

    public function storeExpense(Request $request, FinanceService $service): RedirectResponse
    {
        $this->authorize(Permission::FinanceManage->value);

        $validated = $request->validate([
            'category' => ['required', Rule::in(Expense::CATEGORIES)],
            'description' => ['required', 'string', 'max:160'],
            'amount' => ['required', 'numeric', 'min:0.01', 'max:999999999.99'],
            'expense_date' => ['required', 'date'],
            'method' => ['required', Rule::in(Expense::METHODS)],
            'reference' => ['nullable', 'string', 'max:120'],
            'supplier' => ['nullable', 'string', 'max:120'],
            'idempotency_key' => ['nullable', 'string', 'max:64'],
        ]);

        $service->registerExpense($validated, $request->user());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Gasto registrado correctamente.',
        ]);

        return back();
    }

    public function voidExpense(
        Request $request,
        Expense $expense,
        FinanceService $service,
    ): RedirectResponse {
        $this->authorize(Permission::FinanceVoid->value);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $service->voidExpense($expense, $request->user(), $validated['reason']);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Gasto anulado con su movimiento de reverso.',
        ]);

        return back();
    }

    public function voidBill(
        Request $request,
        Bill $bill,
        FinanceService $service,
    ): RedirectResponse {
        $this->authorize(Permission::FinanceVoid->value);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $service->voidBill($bill, $request->user(), $validated['reason']);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Factura anulada correctamente.',
        ]);

        return back();
    }

    /**
     * Export one dataset as an Excel-compatible CSV file.
     */
    public function export(Request $request): StreamedResponse
    {
        $this->authorize(Permission::ReportsExport->value);

        $hotel = app(CurrentHotel::class)->model();
        $timezone = app(CurrentHotel::class)->timezone();
        [$from, $to] = $this->resolvePeriod($request, $timezone);

        $type = (string) $request->input('type', 'movements');
        $type = in_array($type, ['bills', 'payments', 'expenses', 'movements'], true) ? $type : 'movements';

        $filename = "finanzas-{$type}-{$from->toDateString()}-{$to->toDateString()}.csv";

        return response()->streamDownload(function () use ($type, $from, $to): void {
            $handle = fopen('php://output', 'w');

            if ($handle === false) {
                return;
            }

            // BOM keeps accents readable when the CSV opens in Excel.
            fwrite($handle, "\xEF\xBB\xBF");

            match ($type) {
                'bills' => $this->exportBills($handle, $from, $to),
                'payments' => $this->exportPayments($handle, $from, $to),
                'expenses' => $this->exportExpenses($handle, $from, $to),
                default => $this->exportMovements($handle, $from, $to),
            };

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /**
     * @param  resource  $handle
     */
    private function exportBills($handle, CarbonImmutable $from, CarbonImmutable $to): void
    {
        fputcsv($handle, ['Factura', 'Cliente', 'Emitida', 'Subtotal', 'Impuesto', 'Total', 'Cobrado', 'Balance', 'Estado']);

        $this->billsQuery($from, $to, '', '')->cursor()->each(function (Bill $bill) use ($handle): void {
            $paid = round((float) ($bill->paid_total ?? 0), 2);

            fputcsv($handle, [
                $bill->number,
                $bill->client ? "{$bill->client->first_name} {$bill->client->last_name}" : '',
                $bill->issued_at?->toDateString(),
                number_format((float) $bill->subtotal, 2, '.', ''),
                number_format((float) $bill->tax, 2, '.', ''),
                number_format((float) $bill->total, 2, '.', ''),
                number_format($paid, 2, '.', ''),
                number_format((float) $bill->total - $paid, 2, '.', ''),
                $bill->status,
            ]);
        });
    }

    /**
     * @param  resource  $handle
     */
    private function exportPayments($handle, CarbonImmutable $from, CarbonImmutable $to): void
    {
        fputcsv($handle, ['Cobro', 'Factura', 'Cliente', 'Fecha', 'Metodo', 'Monto', 'Referencia', 'Estado', 'Motivo anulacion']);

        $this->paymentsQuery($from, $to, '', '', '')->cursor()->each(function (Payment $payment) use ($handle): void {
            fputcsv($handle, [
                $payment->id,
                $payment->bill->number,
                $payment->client ? "{$payment->client->first_name} {$payment->client->last_name}" : '',
                $payment->paid_at->toDateString(),
                $payment->method,
                number_format((float) $payment->amount, 2, '.', ''),
                $payment->reference,
                $payment->status,
                $payment->void_reason,
            ]);
        });
    }

    /**
     * @param  resource  $handle
     */
    private function exportExpenses($handle, CarbonImmutable $from, CarbonImmutable $to): void
    {
        fputcsv($handle, ['Gasto', 'Categoria', 'Descripcion', 'Fecha', 'Metodo', 'Monto', 'Suplidor', 'Referencia', 'Estado', 'Motivo anulacion']);

        $this->expensesQuery($from, $to, '', '', '')->cursor()->each(function (Expense $expense) use ($handle): void {
            fputcsv($handle, [
                $expense->id,
                $expense->category,
                $expense->description,
                $expense->expense_date->toDateString(),
                $expense->method,
                number_format((float) $expense->amount, 2, '.', ''),
                $expense->supplier,
                $expense->reference,
                $expense->status,
                $expense->void_reason,
            ]);
        });
    }

    /**
     * @param  resource  $handle
     */
    private function exportMovements($handle, CarbonImmutable $from, CarbonImmutable $to): void
    {
        fputcsv($handle, ['Movimiento', 'Fecha', 'Direccion', 'Monto', 'Descripcion', 'Reversa de']);

        $this->movementsQuery($from, $to, '', '')->cursor()->each(function (FinanceMovement $movement) use ($handle): void {
            fputcsv($handle, [
                $movement->id,
                $movement->occurred_at->toDateString(),
                $movement->direction,
                number_format((float) $movement->amount, 2, '.', ''),
                $movement->description,
                $movement->reversal_of_id,
            ]);
        });
    }

    /**
     * @return Builder<Bill>
     */
    private function billsQuery(
        CarbonImmutable $from,
        CarbonImmutable $to,
        string $search,
        string $state,
    ): Builder {
        return Bill::query()
            ->with(['client:id,first_name,last_name', 'voidedBy:id,name'])
            ->withSum(['payments as paid_total' => fn (Builder $query) => $query->where('status', 'registrado')], 'amount')
            ->whereDate('issued_at', '>=', $from->toDateString())
            ->whereDate('issued_at', '<=', $to->toDateString())
            ->when(
                in_array($state, self::BILL_STATUSES, true),
                fn (Builder $query) => $query->where('status', $state),
            )
            ->when($search !== '', function (Builder $query) use ($search): void {
                $query->where(function (Builder $query) use ($search): void {
                    $query->where('number', 'like', "%{$search}%")
                        ->orWhere('status', 'like', "%{$search}%")
                        ->orWhereHas('client', function (Builder $client) use ($search): void {
                            $client->where('first_name', 'like', "%{$search}%")
                                ->orWhere('last_name', 'like', "%{$search}%");
                        });
                });
            });
    }

    /**
     * @return Builder<Payment>
     */
    private function paymentsQuery(
        CarbonImmutable $from,
        CarbonImmutable $to,
        string $search,
        string $method,
        string $state,
    ): Builder {
        return Payment::query()
            ->with([
                'bill:id,number',
                'client:id,first_name,last_name',
                'createdBy:id,name',
                'voidedBy:id,name',
            ])
            ->whereDate('paid_at', '>=', $from->toDateString())
            ->whereDate('paid_at', '<=', $to->toDateString())
            ->when(
                in_array($method, Payment::METHODS, true),
                fn (Builder $query) => $query->where('method', $method),
            )
            ->when(
                in_array($state, Payment::STATUSES, true),
                fn (Builder $query) => $query->where('status', $state),
            )
            ->when($search !== '', function (Builder $query) use ($search): void {
                $query->where(function (Builder $query) use ($search): void {
                    $query->where('reference', 'like', "%{$search}%")
                        ->orWhere('notes', 'like', "%{$search}%")
                        ->orWhereHas('bill', fn (Builder $bill) => $bill->where('number', 'like', "%{$search}%"))
                        ->orWhereHas('client', function (Builder $client) use ($search): void {
                            $client->where('first_name', 'like', "%{$search}%")
                                ->orWhere('last_name', 'like', "%{$search}%");
                        });
                });
            });
    }

    /**
     * @return Builder<Expense>
     */
    private function expensesQuery(
        CarbonImmutable $from,
        CarbonImmutable $to,
        string $search,
        string $category,
        string $state,
    ): Builder {
        return Expense::query()
            ->with(['createdBy:id,name', 'voidedBy:id,name'])
            ->whereDate('expense_date', '>=', $from->toDateString())
            ->whereDate('expense_date', '<=', $to->toDateString())
            ->when(
                in_array($category, Expense::CATEGORIES, true),
                fn (Builder $query) => $query->where('category', $category),
            )
            ->when(
                in_array($state, Expense::STATUSES, true),
                fn (Builder $query) => $query->where('status', $state),
            )
            ->when($search !== '', function (Builder $query) use ($search): void {
                $query->where(function (Builder $query) use ($search): void {
                    $query->where('description', 'like', "%{$search}%")
                        ->orWhere('supplier', 'like', "%{$search}%")
                        ->orWhere('reference', 'like', "%{$search}%");
                });
            });
    }

    /**
     * @return Builder<FinanceMovement>
     */
    private function movementsQuery(
        CarbonImmutable $from,
        CarbonImmutable $to,
        string $search,
        string $direction,
    ): Builder {
        return FinanceMovement::query()
            ->with('createdBy:id,name')
            ->whereBetween('occurred_at', [
                $from->startOfDay()->utc(),
                $to->endOfDay()->utc(),
            ])
            ->when(
                in_array($direction, FinanceMovement::DIRECTIONS, true),
                fn (Builder $query) => $query->where('direction', $direction),
            )
            ->when($search !== '', function (Builder $query) use ($search): void {
                $query->where('description', 'like', "%{$search}%");
            });
    }

    /**
     * @return array{invoiced: float, collected: float, expenses: float, net: float, invoicedCount: int, pendingCount: int}
     */
    private function periodTotals(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $invoiced = round((float) Bill::query()
            ->where('active', true)
            ->where('status', '!=', 'Anulada')
            ->whereDate('issued_at', '>=', $from->toDateString())
            ->whereDate('issued_at', '<=', $to->toDateString())
            ->sum('total'), 2);

        $collected = round((float) Payment::query()
            ->where('status', 'registrado')
            ->whereDate('paid_at', '>=', $from->toDateString())
            ->whereDate('paid_at', '<=', $to->toDateString())
            ->sum('amount'), 2);

        $expenses = round((float) Expense::query()
            ->where('status', 'registrado')
            ->whereDate('expense_date', '>=', $from->toDateString())
            ->whereDate('expense_date', '<=', $to->toDateString())
            ->sum('amount'), 2);

        return [
            'invoiced' => $invoiced,
            'collected' => $collected,
            'expenses' => $expenses,
            'net' => round($collected - $expenses, 2),
            'invoicedCount' => Bill::query()
                ->where('active', true)
                ->where('status', '!=', 'Anulada')
                ->whereDate('issued_at', '>=', $from->toDateString())
                ->whereDate('issued_at', '<=', $to->toDateString())
                ->count(),
            'pendingCount' => Bill::query()
                ->where('active', true)
                ->where('status', 'Pendiente')
                ->whereDate('issued_at', '<=', $to->toDateString())
                ->count(),
        ];
    }

    /**
     * Outstanding receivable as of the end of the period.
     */
    private function pendingReceivable(CarbonImmutable $to): float
    {
        $billed = (float) Bill::query()
            ->where('active', true)
            ->where('status', '!=', 'Anulada')
            ->whereDate('issued_at', '<=', $to->toDateString())
            ->sum('total');

        $collected = (float) Payment::query()
            ->where('status', 'registrado')
            ->whereDate('paid_at', '<=', $to->toDateString())
            ->sum('amount');

        return round(max(0, $billed - $collected), 2);
    }

    /**
     * Invoiced, collected and expenses for the last six months.
     *
     * Rows are grouped in PHP so the same code works on SQLite and MySQL.
     *
     * @return list<array{month: string, label: string, invoiced: float, collected: float, expenses: float}>
     */
    private function monthlySeries(CarbonImmutable $to): array
    {
        $start = $to->copy()->startOfMonth()->subMonths(5);
        $end = $to->copy()->endOfMonth();

        $series = [];

        for ($index = 0; $index < 6; $index++) {
            $month = $start->copy()->addMonths($index);
            $key = $month->format('Y-m');

            $series[$key] = [
                'month' => $key,
                'label' => self::MONTHS[(int) $month->format('n') - 1],
                'invoiced' => 0.0,
                'collected' => 0.0,
                'expenses' => 0.0,
            ];
        }

        Bill::query()
            ->where('active', true)
            ->where('status', '!=', 'Anulada')
            ->whereDate('issued_at', '>=', $start->toDateString())
            ->whereDate('issued_at', '<=', $end->toDateString())
            ->get(['issued_at', 'total'])
            ->each(function (Bill $bill) use (&$series): void {
                $key = $bill->issued_at->format('Y-m');

                if (isset($series[$key])) {
                    $series[$key]['invoiced'] = round($series[$key]['invoiced'] + (float) $bill->total, 2);
                }
            });

        Payment::query()
            ->where('status', 'registrado')
            ->whereDate('paid_at', '>=', $start->toDateString())
            ->whereDate('paid_at', '<=', $end->toDateString())
            ->get(['paid_at', 'amount'])
            ->each(function (Payment $payment) use (&$series): void {
                $key = $payment->paid_at->format('Y-m');

                if (isset($series[$key])) {
                    $series[$key]['collected'] = round($series[$key]['collected'] + (float) $payment->amount, 2);
                }
            });

        Expense::query()
            ->where('status', 'registrado')
            ->whereDate('expense_date', '>=', $start->toDateString())
            ->whereDate('expense_date', '<=', $end->toDateString())
            ->get(['expense_date', 'amount'])
            ->each(function (Expense $expense) use (&$series): void {
                $key = $expense->expense_date->format('Y-m');

                if (isset($series[$key])) {
                    $series[$key]['expenses'] = round($series[$key]['expenses'] + (float) $expense->amount, 2);
                }
            });

        return array_values($series);
    }

    /**
     * Invoices that still have a balance, used by the payment dialog.
     *
     * @return list<array{id: int, number: string, client: string, total: float, paid: float, balance: float, issued_at: string}>
     */
    private function payableBills(): array
    {
        return array_values(Bill::query()
            ->with('client:id,first_name,last_name')
            ->withSum(['payments as paid_total' => fn (Builder $query) => $query->where('status', 'registrado')], 'amount')
            ->where('active', true)
            ->whereIn('status', ['Pendiente', 'Pagada'])
            ->latest('issued_at')
            ->limit(200)
            ->get(['id', 'client_id', 'number', 'total', 'issued_at'])
            ->map(function (Bill $bill): array {
                $paid = round((float) ($bill->paid_total ?? 0), 2);

                return [
                    'id' => $bill->id,
                    'number' => $bill->number,
                    'client' => $bill->client
                        ? "{$bill->client->first_name} {$bill->client->last_name}"
                        : "Cliente #{$bill->client_id}",
                    'total' => round((float) $bill->total, 2),
                    'paid' => $paid,
                    'balance' => round((float) $bill->total - $paid, 2),
                    'issued_at' => $bill->issued_at->toDateString(),
                ];
            })
            ->filter(fn (array $bill): bool => $bill['balance'] > 0.005)
            ->values()
            ->all());
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

        return $date instanceof CarbonImmutable ? $date->startOfDay() : null;
    }

    /**
     * @param  list<string>  $allowed
     */
    private function filterValue(Request $request, string $key, array $allowed): string
    {
        $value = (string) $request->input($key, '');

        return in_array($value, $allowed, true) ? $value : '';
    }

    private function percentChange(float $current, float $previous): ?float
    {
        if ($previous <= 0.0) {
            return null;
        }

        return round((($current - $previous) / $previous) * 100, 1);
    }
}
