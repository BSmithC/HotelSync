export type ReceptionClient = {
    id: number;
    first_name: string;
    last_name: string;
    phone_number?: string | null;
    cedula?: string | null;
    rnc?: string | null;
    address?: string | null;
    active?: boolean;
};

export type ReceptionUser = {
    id: number;
    name: string;
};

export type ReceptionReservation = {
    id: number;
    client_id: number;
    room_id: number | null;
    reserved_at: string;
    finished_at: string | null;
    checked_in_at: string | null;
    checked_out_at: string | null;
    guests: number;
    status: string;
    active: boolean;
    notes?: string | null;
    client?: ReceptionClient | null;
    room?: { id: number; name: string } | null;
    checked_in_by?: ReceptionUser | null;
    checked_out_by?: ReceptionUser | null;
};

export type ReceptionRoom = {
    id: number;
    name: string;
    status: string;
    capacity: number;
    price?: string | number | null;
    description?: string | null;
    area?: { id: number; name: string } | null;
    current_reservation?: ReceptionReservation | null;
};

export type ReceptionIncident = {
    id: number;
    room_id: number | null;
    reservation_id: number | null;
    type: string;
    severity: string;
    title: string;
    description: string;
    status: string;
    resolution: string | null;
    resolved_at: string | null;
    created_at: string;
    room?: { id: number; name: string } | null;
    reservation?:
        (ReceptionReservation & { client?: ReceptionClient | null }) | null;
    reported_by?: ReceptionUser | null;
    resolved_by?: ReceptionUser | null;
};

export type ReceptionKpis = {
    arrivals: number;
    pendingArrivals: number;
    departures: number;
    overdueDepartures: number;
    inHouse: number;
    availableRooms: number;
    occupiedRooms: number;
    openIncidents: number;
};

export type ReceptionRoomCounts = {
    disponible: number;
    ocupada: number;
    reservada: number;
    limpieza: number;
    mantenimiento: number;
};

export type ReceptionFilters = {
    search: string;
    date: string;
    state: string;
    incident_status: string;
};

export type ReceptionOptions = {
    roomStatuses: string[];
    incidentTypes: string[];
    incidentSeverities: string[];
    incidentStatuses: string[];
};

export type ReceptionPermissions = {
    operate: boolean;
    incidents: boolean;
};

export type ReceptionQuickSearch = {
    clients: ReceptionClient[];
    reservations: ReceptionReservation[];
};

export type RoomOption = {
    id: number;
    name: string;
    status: string;
};

export type ReservationOption = {
    id: number;
    room_id: number | null;
    client?: { first_name: string; last_name: string } | null;
};

export type GuestStayStats = {
    stays: number;
    completed: number;
    inHouse: boolean;
    incidents: number;
};
