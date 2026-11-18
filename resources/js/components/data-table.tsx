import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export type SortDirection = 'asc' | 'desc';

export type DataTableColumn<T> = {
    /** Stable identifier used by sorting callbacks. */
    id: string;
    header: ReactNode;
    cell: (row: T, index: number) => ReactNode;
    sortable?: boolean;
    align?: 'left' | 'center' | 'right';
    className?: string;
    headerClassName?: string;
};

const alignment = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
} as const;

function SortIcon({
    column,
    sort,
}: {
    column: string;
    sort?: { column: string; direction: SortDirection };
}) {
    if (sort?.column !== column) {
        return <ArrowUpDown className="size-3.5 opacity-50" />;
    }

    return sort.direction === 'asc' ? (
        <ArrowUp className="size-3.5" />
    ) : (
        <ArrowDown className="size-3.5" />
    );
}

export function DataTable<T>({
    columns,
    rows,
    rowKey,
    loading = false,
    skeletonRows = 5,
    sort,
    onSortChange,
    empty,
    caption,
    footer,
    className,
    tableClassName,
}: {
    columns: DataTableColumn<T>[];
    rows: T[];
    rowKey: (row: T, index: number) => string | number;
    loading?: boolean;
    skeletonRows?: number;
    sort?: { column: string; direction: SortDirection };
    onSortChange?: (column: string) => void;
    empty?: ReactNode;
    caption?: string;
    footer?: ReactNode;
    className?: string;
    tableClassName?: string;
}) {
    const showEmpty = !loading && rows.length === 0;

    return (
        <div
            className={cn(
                'overflow-hidden rounded-xl border border-border bg-card',
                className,
            )}
        >
            <Table className={cn('min-w-160', tableClassName)}>
                {caption && <caption className="sr-only">{caption}</caption>}
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        {columns.map((column) => (
                            <TableHead
                                key={column.id}
                                aria-sort={
                                    sort?.column === column.id
                                        ? sort.direction === 'asc'
                                            ? 'ascending'
                                            : 'descending'
                                        : undefined
                                }
                                className={cn(
                                    'h-11 bg-muted/40 px-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase',
                                    alignment[column.align ?? 'left'],
                                    column.headerClassName,
                                )}
                            >
                                {column.sortable ? (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onSortChange?.(column.id)
                                        }
                                        className="-mx-1 inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                    >
                                        {column.header}
                                        <SortIcon
                                            column={column.id}
                                            sort={sort}
                                        />
                                    </button>
                                ) : (
                                    column.header
                                )}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading &&
                        Array.from({ length: skeletonRows }).map((_, index) => (
                            <TableRow key={`skeleton-${index}`}>
                                {columns.map((column) => (
                                    <TableCell
                                        key={column.id}
                                        className={cn(
                                            'px-4 py-3.5',
                                            column.className,
                                        )}
                                    >
                                        <Skeleton className="h-4 w-full max-w-40" />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}

                    {showEmpty && (
                        <TableRow className="hover:bg-transparent">
                            <TableCell
                                colSpan={columns.length}
                                className="p-0 whitespace-normal"
                            >
                                {empty ?? (
                                    <EmptyState
                                        title="Sin resultados"
                                        description="Ajusta los filtros o la búsqueda para ver datos."
                                    />
                                )}
                            </TableCell>
                        </TableRow>
                    )}

                    {!loading &&
                        rows.map((row, index) => (
                            <TableRow key={rowKey(row, index)}>
                                {columns.map((column) => (
                                    <TableCell
                                        key={column.id}
                                        className={cn(
                                            'px-4 py-3.5',
                                            alignment[column.align ?? 'left'],
                                            column.className,
                                        )}
                                    >
                                        {column.cell(row, index)}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                </TableBody>
            </Table>

            {footer && (
                <div className="border-t border-border bg-card px-4 py-3">
                    {footer}
                </div>
            )}
        </div>
    );
}
