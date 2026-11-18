export type AreaType =
    | 'edificio'
    | 'piso'
    | 'zona'
    | 'pasillo'
    | 'jardin'
    | 'piscina'
    | 'terraza'
    | 'salon'
    | 'otro';

export type RoomStatusKey =
    'disponible' | 'ocupada' | 'reservada' | 'limpieza' | 'mantenimiento';

export type RoomStatusColors = Record<RoomStatusKey, string>;

export type AreaBuilding = {
    id: number;
    name: string;
};

export type AreaData = {
    id: number;
    name: string;
    type: AreaType;
    color: string | null;
    floor: number | null;
    building_id: number | null;
    building?: AreaBuilding | null;
    x: number;
    y: number;
    width: number;
    height: number;
    active: boolean;
};

export type RoomData = {
    id: number;
    name: string;
    capacity: number;
    category: string | null;
    bed_count: number;
    amenities: string[];
    area_id: number;
    pos_x: number;
    pos_y: number;
    width: number;
    height: number;
    rotation: number;
    shape: string;
    active: boolean;
    description: string | null;
    price: string | null;
    phone: string | null;
    status: string;
    area?: AreaData | null;
};

export type RoomClient = {
    id: number;
    first_name: string;
    last_name: string;
    phone_number?: string | null;
    cedula?: string | null;
};

export type RoomReservation = {
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
    client?: RoomClient | null;
    room?: { id: number; name: string } | null;
    checked_in_by?: { id: number; name: string } | null;
};

export type RoomStatusLogEntry = {
    id: number;
    previous_status: string | null;
    status: string;
    reason: string | null;
    created_at: string | null;
    changed_by: { id: number; name: string } | null;
};

export type RoomAssignmentEntry = {
    id: number;
    reservation_id: number;
    assigned_at: string;
    reason: string | null;
    from_room: { id: number; name: string } | null;
    to_room: { id: number; name: string } | null;
    assigned_by: { id: number; name: string } | null;
};

export type RoomOpenIncident = {
    id: number;
    type: string;
    severity: string;
    title: string;
    description: string;
    status: string;
    created_at: string | null;
    reported_by: { id: number; name: string } | null;
};

export type RoomDetails = RoomData & {
    current_reservation: RoomReservation | null;
    next_reservation: RoomReservation | null;
    status_history: RoomStatusLogEntry[];
    assignments: RoomAssignmentEntry[];
    open_incidents: RoomOpenIncident[];
};

export type RoomSharedProps = {
    roomStatusColors: RoomStatusColors;
};

/** Options the side panel receives to run reception actions. */
export type RoomPanelOptions = {
    roomsForAssignment: { id: number; name: string; status: string }[];
    roomsForIncidents: { id: number; name: string; status: string }[];
    reservationsForIncidents: {
        id: number;
        room_id: number | null;
        client?: { first_name: string; last_name: string } | null;
    }[];
    roomStatuses: string[];
    incidentTypes: string[];
    incidentSeverities: string[];
};
