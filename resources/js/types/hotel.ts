export type HotelSummary = {
    id: number;
    name: string;
    slug: string;
    /** ISO code of the hotel currency; only shared for the current hotel. */
    currency?: string;
};

export type HotelSharedProps = {
    currentHotel: HotelSummary | null;
    hotels: HotelSummary[];
};
