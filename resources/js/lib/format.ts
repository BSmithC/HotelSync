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

export function formatDate(value?: string | null): string {
    if (!value) {
        return '—';
    }

    return parseDate(value).toLocaleDateString('es-DO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

export function formatDateShort(value?: string | null): string {
    if (!value) {
        return '—';
    }

    return parseDate(value).toLocaleDateString('es-DO', {
        day: '2-digit',
        month: 'short',
    });
}

export function formatDateTime(value?: string | null): string {
    if (!value) {
        return '—';
    }

    return parseDate(value).toLocaleString('es-DO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatCurrency(
    value?: string | number | null,
    currency = 'DOP',
): string {
    return new Intl.NumberFormat('es-DO', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
    }).format(Number(value ?? 0));
}

export function formatCompactCurrency(
    value?: string | number | null,
    currency = 'DOP',
): string {
    return new Intl.NumberFormat('es-DO', {
        style: 'currency',
        currency,
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(Number(value ?? 0));
}

export function formatNumber(value?: string | number | null): string {
    return new Intl.NumberFormat('es-DO').format(Number(value ?? 0));
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
