export type DashboardKpis = {
    revenueToday: number;
    paidToday: number;
    revenueTodayChange: number | null;
    revenueMonth: number;
    paidMonth: number;
    revenueMonthChange: number | null;
    activeReservations: number;
    pendingReservations: number;
    inHouseReservations: number;
    inHouseGuests: number;
    totalRooms: number;
    occupiedRooms: number;
    availableRooms: number;
    reservedRooms: number;
    maintenanceRooms: number;
    occupancyRate: number;
};

export type DashboardRevenuePoint = {
    date: string;
    invoiced: number;
    paid: number;
};

export type DashboardTrendPoint = {
    date: string;
    count: number;
};

export type DashboardStatusCount = {
    status: string;
    count: number;
};

export type DashboardAreaCount = {
    area: string;
    count: number;
};

export type DashboardReservation = {
    id: number;
    client: string;
    room: string;
    reservedAt: string | null;
    finishedAt: string | null;
    guests: number;
    status: string;
    active: boolean;
};

export type DashboardBill = {
    id: number;
    number: string;
    client: string;
    issuedAt: string | null;
    total: number;
    status: string;
    active: boolean;
};

export type DashboardProps = {
    currency: string;
    timezone: string;
    generatedAt: string;
    kpis: DashboardKpis;
    revenueSeries: DashboardRevenuePoint[];
    reservationTrend: DashboardTrendPoint[];
    reservationsByStatus: DashboardStatusCount[];
    roomDistribution: DashboardAreaCount[];
    recentReservations: DashboardReservation[];
    upcomingCheckIns: DashboardReservation[];
    upcomingCheckOuts: DashboardReservation[];
    recentBills: DashboardBill[];
};
