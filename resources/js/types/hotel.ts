export type HotelSummary = {
    id: number;
    name: string;
    slug: string;
};

export type HotelSharedProps = {
    currentHotel: HotelSummary | null;
    hotels: HotelSummary[];
};
