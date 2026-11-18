/**
 * Active locale/currency for the current hotel.
 *
 * The shared Inertia props configure these values on every request. Screens
 * that need a deterministic preview can pass an explicit locale/currency to
 * the functions instead of relying on the module state.
 */
let activeLocale = 'es-DO';
let activeCurrency = 'DOP';

export function configureFormatting(options: {
    locale?: string | null;
    currency?: string | null;
}): void {
    if (options.locale) {
        activeLocale = options.locale;
    }

    if (options.currency) {
        activeCurrency = options.currency.toUpperCase();
    }
}

export function formatLocale(): string {
    return activeLocale;
}

/**
 * Parses a date value without shifting date-only strings across timezones.
 *
 * `new Date('2026-11-18')` is interpreted as UTC midnight, which can render as
 * the previous day in negative offsets. Date-only fields (like bill issue
 * dates) are calendar dates, so they are built in local time instead.
 */
export function parseDate(value: string): Date {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split('-').map(Number);

        return new Date(year, month - 1, day);
    }

    return new Date(value);
}

/**
 * `Intl` uses non-breaking spaces in some locales and ICU versions (for
 * example before "p. m."). The server renderer and the browser can disagree
 * on which character they emit, which breaks hydration, so both are
 * normalized to a regular space.
 */
function normalizeSpaces(value: string): string {
    return value.replace(/[\u00a0\u202f]/g, ' ');
}

export function formatDate(
    value?: string | null,
    locale = activeLocale,
): string {
    if (!value) {
        return '—';
    }

    return normalizeSpaces(
        parseDate(value).toLocaleDateString(locale, {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        }),
    );
}

export function formatDateShort(
    value?: string | null,
    locale = activeLocale,
): string {
    if (!value) {
        return '—';
    }

    return normalizeSpaces(
        parseDate(value).toLocaleDateString(locale, {
            day: '2-digit',
            month: 'short',
        }),
    );
}

export function formatDateTime(
    value?: string | null,
    locale = activeLocale,
): string {
    if (!value) {
        return '—';
    }

    return normalizeSpaces(
        parseDate(value).toLocaleString(locale, {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }),
    );
}

export function formatCurrency(
    value?: string | number | null,
    currency = activeCurrency,
    locale = activeLocale,
): string {
    return normalizeSpaces(
        new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
            minimumFractionDigits: 2,
        }).format(Number(value ?? 0)),
    );
}

export function formatCompactCurrency(
    value?: string | number | null,
    currency = activeCurrency,
    locale = activeLocale,
): string {
    return normalizeSpaces(
        new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
            notation: 'compact',
            maximumFractionDigits: 1,
        }).format(Number(value ?? 0)),
    );
}

export function formatNumber(
    value?: string | number | null,
    locale = activeLocale,
): string {
    return normalizeSpaces(
        new Intl.NumberFormat(locale).format(Number(value ?? 0)),
    );
}

export function toDateInput(value?: string | null): string {
    if (!value) {
        return '';
    }

    return new Date(value).toISOString().slice(0, 10);
}

export function toDateTimeInput(value?: string | null): string {
    if (!value) {
        return '';
    }

    const date = new Date(value);
    const pad = (part: number) => String(part).padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
        date.getDate(),
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
