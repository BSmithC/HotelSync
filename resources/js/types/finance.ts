import type { Paginated } from './ui';

export type FinanceClient = {
    id: number;
    first_name: string;
    last_name: string;
};

export type FinanceUser = {
    id: number;
    name: string;
};

export type FinanceBill = {
    id: number;
    client_id: number;
    number: string;
    issued_at: string;
    subtotal: string | number;
    tax: string | number;
    total: string | number;
    status: string;
    active: boolean;
    voided_at: string | null;
    void_reason: string | null;
    paid_total?: string | number | null;
    client?: FinanceClient | null;
    voided_by?: FinanceUser | null;
};

export type FinancePayment = {
    id: number;
    bill_id: number;
    client_id: number | null;
    method: string;
    amount: string | number;
    paid_at: string;
    reference: string | null;
    notes: string | null;
    status: string;
    created_at: string;
    voided_at: string | null;
    void_reason: string | null;
    bill?: { id: number; number: string } | null;
    client?: FinanceClient | null;
    created_by?: FinanceUser | null;
    voided_by?: FinanceUser | null;
};

export type FinanceExpense = {
    id: number;
    category: string;
    description: string;
    amount: string | number;
    expense_date: string;
    method: string;
    reference: string | null;
    supplier: string | null;
    status: string;
    created_at: string;
    voided_at: string | null;
    void_reason: string | null;
    created_by?: FinanceUser | null;
    voided_by?: FinanceUser | null;
};

export type FinanceMovement = {
    id: number;
    direction: string;
    amount: string | number;
    description: string;
    source_type: string | null;
    source_id: number | null;
    occurred_at: string;
    reversal_of_id: number | null;
    created_by?: FinanceUser | null;
};

export type FinanceKpis = {
    invoiced: number;
    collected: number;
    expenses: number;
    net: number;
    pending: number;
    invoicedCount: number;
    pendingCount: number;
    change: {
        invoiced: number | null;
        collected: number | null;
        expenses: number | null;
        net: number | null;
    };
};

export type FinancePeriodTotals = {
    invoiced: number;
    collected: number;
    expenses: number;
    net: number;
    invoicedCount: number;
    pendingCount: number;
};

export type FinanceSeriesPoint = {
    month: string;
    label: string;
    invoiced: number;
    collected: number;
    expenses: number;
};

export type FinancePayableBill = {
    id: number;
    number: string;
    client: string;
    total: number;
    paid: number;
    balance: number;
    issued_at: string | null;
};

export type FinancePeriod = {
    from: string;
    to: string;
    days: number;
};

export type FinanceFilters = {
    from: string;
    to: string;
    search: string;
    bill_state: string;
    payment_state: string;
    payment_method: string;
    expense_state: string;
    expense_category: string;
    movement_direction: string;
    tab: 'resumen' | 'facturas' | 'cobros' | 'gastos' | 'movimientos';
};

export type FinanceOptions = {
    billStatuses: string[];
    paymentMethods: string[];
    paymentStatuses: string[];
    expenseCategories: string[];
    expenseMethods: string[];
    expenseStatuses: string[];
    movementDirections: string[];
};

export type FinancePermissions = {
    manage: boolean;
    void: boolean;
    export: boolean;
};

export type FinanceIndexProps = {
    currency: string;
    timezone: string;
    period: FinancePeriod;
    kpis: FinanceKpis;
    previous: FinancePeriodTotals;
    series: FinanceSeriesPoint[];
    bills: Paginated<FinanceBill>;
    payments: Paginated<FinancePayment>;
    expenses: Paginated<FinanceExpense>;
    movements: Paginated<FinanceMovement>;
    payableBills: FinancePayableBill[];
    filters: FinanceFilters;
    options: FinanceOptions;
    permissions: FinancePermissions;
};
