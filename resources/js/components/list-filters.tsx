import { router } from '@inertiajs/react';
import { Search, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

/**
 * Radix Select does not accept an empty string as an item value, so "all"
 * is represented by a sentinel that never reaches the query string.
 */
const ALL = '__all__';

export type ListFilterOption = {
    value: string;
    label: string;
};

export type ListFilterSelect = {
    key: string;
    label: string;
    options: ListFilterOption[];
    value?: string | null;
};

type FilterValues = Record<string, string>;

/**
 * Toolbar shared by every list index: a debounced search field plus any
 * number of select filters. Every change resets pagination and preserves the
 * current scroll position.
 */
export function ListFilters({
    url,
    search,
    searchPlaceholder = 'Buscar…',
    selects = [],
    extraParams = {},
}: {
    url: string;
    search?: string | null;
    searchPlaceholder?: string;
    selects?: ListFilterSelect[];
    /**
     * Parameters that are not part of the filter form (for example the
     * calendar month or view) but must survive every filter request.
     */
    extraParams?: Record<string, string>;
}) {
    const [values, setValues] = useState<FilterValues>(() => ({
        search: search ?? '',
        ...Object.fromEntries(
            selects.map(
                (select) =>
                    [select.key, select.value ?? ''] as [string, string],
            ),
        ),
    }));

    const timer = useRef<number | undefined>(undefined);
    const valuesRef = useRef(values);
    const lastCommittedSearch = useRef(search ?? '');

    useEffect(() => {
        valuesRef.current = values;
    }, [values]);

    const commit = useCallback(
        (next: FilterValues) => {
            const params: Record<string, string> = { ...extraParams };

            Object.entries(next).forEach(([key, value]) => {
                if (value !== '') {
                    params[key] = value;
                }
            });

            router.get(url, params, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        },
        [url, extraParams],
    );

    // Debounce free-text search so typing does not trigger a request per key.
    useEffect(() => {
        if (values.search === lastCommittedSearch.current) {
            return;
        }

        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
            lastCommittedSearch.current = valuesRef.current.search;
            commit(valuesRef.current);
        }, 350);

        return () => window.clearTimeout(timer.current);
    }, [values.search, commit]);

    useEffect(() => () => window.clearTimeout(timer.current), []);

    const handleSearch = (value: string) => {
        setValues((previous) => ({ ...previous, search: value }));
    };

    const clearSearch = () => {
        window.clearTimeout(timer.current);
        lastCommittedSearch.current = '';

        const next = { ...values, search: '' };
        setValues(next);
        commit(next);
    };

    const handleSelect = (key: string, value: string) => {
        window.clearTimeout(timer.current);

        const next = { ...values, [key]: value };
        setValues(next);
        commit(next);
    };

    const reset = () => {
        window.clearTimeout(timer.current);
        lastCommittedSearch.current = '';

        const cleared = Object.fromEntries(
            Object.keys(values).map((key) => [key, ''] as [string, string]),
        );
        setValues(cleared);
        commit(cleared);
    };

    const hasFilters = Object.values(values).some((value) => value !== '');

    return (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-xs">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={values.search}
                    onChange={(event) => handleSearch(event.target.value)}
                    placeholder={searchPlaceholder}
                    aria-label={searchPlaceholder}
                    className="pr-9 pl-9"
                />
                {values.search !== '' && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={clearSearch}
                        aria-label="Limpiar búsqueda"
                        className="absolute top-1/2 right-1 size-7 -translate-y-1/2"
                    >
                        <X className="size-3.5" />
                    </Button>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {selects.map((select) => (
                    <Select
                        key={select.key}
                        value={values[select.key] || ALL}
                        onValueChange={(value) =>
                            handleSelect(select.key, value === ALL ? '' : value)
                        }
                    >
                        <SelectTrigger
                            aria-label={select.label}
                            className="w-full sm:w-auto sm:min-w-44"
                        >
                            <SelectValue placeholder={select.label} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>
                                {select.label}: todos
                            </SelectItem>
                            {select.options.map((option) => (
                                <SelectItem
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ))}

                {hasFilters && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={reset}
                    >
                        <X className="size-3.5" />
                        Limpiar
                    </Button>
                )}
            </div>
        </div>
    );
}
