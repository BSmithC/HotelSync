export type HotelSummary = {
    id: number;
    name: string;
    slug: string;
    legal_name?: string | null;
    rnc?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    /** ISO code of the hotel currency; only shared for the current hotel. */
    currency?: string;
    /** IANA timezone of the hotel; only shared for the current hotel. */
    timezone?: string;
};

/**
 * Resolved hotel preferences shared with every Inertia page.
 *
 * The backend merges `hotels.settings` over safe defaults, so these values
 * are always present even when the JSON column is still empty.
 */
export type HotelConfig = {
    locale: string;
    check_in_time: string;
    check_out_time: string;
    min_nights: number;
    max_nights: number;
    tax_rate: number;
    invoice_prefix: string;
};

export type HotelSharedProps = {
    currentHotel: HotelSummary | null;
    hotels: HotelSummary[];
    hotelConfig: HotelConfig;
    hotelConfigDefaults: HotelConfig;
};
