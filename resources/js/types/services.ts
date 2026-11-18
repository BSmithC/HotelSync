import type { Paginated } from './ui';

export type ServiceClient = {
    id: number;
    first_name: string;
    last_name: string;
    cedula?: string | null;
};

export type ServiceUser = {
    id: number;
    name: string;
};

export type ServiceCatalogItem = {
    id: number;
    name: string;
    category: string;
    description: string | null;
    price: string | number;
    active: boolean;
    requests_count?: number;
    created_at?: string;
    updated_at?: string;
};

export type ServiceRequest = {
    id: number;
    service_id: number;
    client_id: number | null;
    reservation_id: number | null;
    bill_id: number | null;
    bill_detail_id: number | null;
    status: string;
    quantity: number;
    unit_price: string | number;
    total: string | number;
    requested_at: string;
    completed_at: string | null;
    billed_at: string | null;
    notes: string | null;
    voided_at: string | null;
    void_reason: string | null;
    created_at: string;
    service?: {
        id: number;
        name: string;
        category: string;
    } | null;
    client?: ServiceClient | null;
    reservation?: {
        id: number;
        room_id: number | null;
        room?: {
            id: number;
            name: string;
        } | null;
    } | null;
    bill?: {
        id: number;
        number: string;
        status: string;
        active: boolean;
    } | null;
    created_by?: ServiceUser | null;
    billed_by?: ServiceUser | null;
    voided_by?: ServiceUser | null;
};

export type ServiceOption = {
    id: number;
    name: string;
    category: string;
    price: string | number;
};

export type ServiceReservationOption = {
    id: number;
    client_id: number | null;
    room_id: number | null;
    status: string;
    reserved_at: string;
    client?: ServiceClient | null;
    room?: {
        id: number;
        name: string;
    } | null;
};

export type ServiceBillOption = {
    id: number;
    client_id: number | null;
    number: string;
    total: string | number;
    issued_at: string;
    client?: ServiceClient | null;
};

export type ServiceTopItem = {
    service: string;
    quantity: number;
    total: number;
};

export type ServiceKpis = {
    activeServices: number;
    requested: number;
    open: number;
    readyToBill: number;
    billedRevenue: number;
    billedCount: number;
    averageTicket: number;
    topServices: ServiceTopItem[];
};

export type ServicePeriod = {
    from: string;
    to: string;
};

export type ServiceTab = 'resumen' | 'catalogo' | 'solicitudes';

export type ServiceFilters = {
    from: string;
    to: string;
    search: string;
    category: string;
    service_state: string;
    request_state: string;
    tab: ServiceTab;
};

export type ServiceOptions = {
    categories: string[];
    requestStatuses: string[];
    serviceStates: string[];
};

export type ServicePermissions = {
    manage: boolean;
    bill: boolean;
};

export type ServicesIndexProps = {
    currency: string;
    timezone: string;
    period: ServicePeriod;
    kpis: ServiceKpis;
    services: Paginated<ServiceCatalogItem>;
    requests: Paginated<ServiceRequest>;
    readyRequests: ServiceRequest[];
    recentRequests: ServiceRequest[];
    servicesForRequest: ServiceOption[];
    clientsForRequest: ServiceClient[];
    reservationsForRequest: ServiceReservationOption[];
    openBills: ServiceBillOption[];
    filters: ServiceFilters;
    options: ServiceOptions;
    permissions: ServicePermissions;
};
