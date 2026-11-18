import type { Paginated } from './ui';

export type ReportTab =
    'resumen' | 'finanzas' | 'operacion' | 'servicios' | 'inventario';

export type ReportPeriod = {
    from: string;
    to: string;
    days: number;
    previousFrom: string;
    previousTo: string;
};

export type ReportTotals = {
    invoiced: number;
    invoicedCount: number;
    collected: number;
    collectedCount: number;
    expenses: number;
    expensesCount: number;
    net: number;
    serviceRevenue: number;
    serviceCount: number;
    reservations: number;
    guests: number;
    roomNights: number;
    activeRooms: number;
    occupancyRate: number;
    averageTicket: number;
};

export type ReportKpis = ReportTotals & {
    pending: number;
    change: {
        invoiced: number | null;
        collected: number | null;
        expenses: number | null;
        net: number | null;
        occupancy: number | null;
    };
};

export type ReportSeriesPoint = {
    date: string;
    invoiced: number;
    collected: number;
    expenses: number;
    occupancy: number;
};

export type ReportCategoryTotal = {
    category: string;
    amount: number;
};

export type ReportMethodTotal = {
    method: string;
    amount: number;
    count: number;
};

export type ReportStatusTotal = {
    status: string;
    count: number;
};

export type ReportServiceTotal = {
    service: string;
    quantity: number;
    total: number;
};

export type ReportLowStockItem = {
    id: number;
    name: string;
    sku: string | null;
    unit: string;
    stock: number;
    minStock: number;
};

export type ReportFinanceRow = {
    id: number;
    date: string | null;
    direction: string;
    amount: number;
    description: string | null;
    reversalOfId: number | null;
    createdBy: string | null;
};

export type ReportOperationRow = {
    id: number;
    client: string;
    room: string;
    status: string;
    guests: number;
    arrival: string | null;
    departure: string | null;
    nights: number;
};

export type ReportServiceRow = {
    id: number;
    service: string;
    category: string | null;
    client: string | null;
    status: string;
    quantity: number;
    total: number;
    requestedAt: string | null;
};

export type ReportInventoryRow = {
    id: number;
    item: string;
    sku: string | null;
    unit: string | null;
    type: string;
    quantity: number;
    unitCost: number | null;
    reason: string | null;
    reference: string | null;
    date: string | null;
    state: string;
    createdBy: string | null;
};

export type ReportFilters = {
    from: string;
    to: string;
    tab: ReportTab;
    search: string;
};

export type ReportsIndexProps = {
    currency: string;
    timezone: string;
    generatedAt: string;
    period: ReportPeriod;
    kpis: ReportKpis;
    previous: ReportTotals;
    series: ReportSeriesPoint[];
    expensesByCategory: ReportCategoryTotal[];
    revenueByMethod: ReportMethodTotal[];
    reservationsByStatus: ReportStatusTotal[];
    topServices: ReportServiceTotal[];
    lowStock: ReportLowStockItem[];
    detail:
        | Paginated<ReportFinanceRow>
        | Paginated<ReportOperationRow>
        | Paginated<ReportServiceRow>
        | Paginated<ReportInventoryRow>
        | null;
    counts: {
        finanzas: number;
        operacion: number;
        servicios: number;
        inventario: number;
    };
    filters: ReportFilters;
    permissions: {
        export: boolean;
    };
};
