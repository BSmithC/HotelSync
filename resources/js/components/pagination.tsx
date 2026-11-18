import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PaginatorMeta } from '@/types';

const entityLabels = /&(?:laquo|raquo|amp|#039|quot);/g;

const decodeLabel = (label: string): string =>
    label
        .replace(entityLabels, (entity) => {
            switch (entity) {
                case '&laquo;':
                    return '«';
                case '&raquo;':
                    return '»';
                case '&amp;':
                    return '&';
                case '&#039;':
                    return "'";
                case '&quot;':
                    return '"';
                default:
                    return entity;
            }
        })
        .trim();

export function Pagination({
    meta,
    className,
}: {
    meta: PaginatorMeta;
    className?: string;
}) {
    if (meta.total === 0) {
        return null;
    }

    const links = meta.links ?? [];
    const previous = links[0];
    const next = links[links.length - 1];
    const pages = links.slice(1, -1);

    return (
        <div
            className={cn(
                'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
                className,
            )}
        >
            <p className="text-xs text-muted-foreground">
                Mostrando{' '}
                <span className="font-medium text-foreground">
                    {meta.from ?? 0}
                </span>{' '}
                a{' '}
                <span className="font-medium text-foreground">
                    {meta.to ?? 0}
                </span>{' '}
                de{' '}
                <span className="font-medium text-foreground">
                    {meta.total}
                </span>{' '}
                registros
            </p>

            <nav
                aria-label="Paginación"
                className="flex flex-wrap items-center gap-1"
            >
                <PageLink link={previous} direction="previous" />
                {pages.map((link, index) =>
                    link.url === null && decodeLabel(link.label) === '...' ? (
                        <span
                            key={`ellipsis-${index}`}
                            className="px-1.5 text-xs text-muted-foreground"
                        >
                            …
                        </span>
                    ) : (
                        <Button
                            key={`${link.label}-${index}`}
                            asChild={link.url !== null}
                            variant={link.active ? 'default' : 'outline'}
                            size="icon"
                            className="size-8 text-xs"
                            disabled={link.url === null}
                            aria-current={link.active ? 'page' : undefined}
                        >
                            {link.url !== null ? (
                                <Link
                                    href={link.url}
                                    preserveScroll
                                    preserveState
                                >
                                    {decodeLabel(link.label)}
                                </Link>
                            ) : (
                                <span>{decodeLabel(link.label)}</span>
                            )}
                        </Button>
                    ),
                )}
                <PageLink link={next} direction="next" />
            </nav>
        </div>
    );
}

function PageLink({
    link,
    direction,
}: {
    link: { url: string | null; label: string } | undefined;
    direction: 'previous' | 'next';
}) {
    const Icon = direction === 'previous' ? ChevronLeft : ChevronRight;
    const label = direction === 'previous' ? 'Anterior' : 'Siguiente';

    if (!link || link.url === null) {
        return (
            <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                disabled
                aria-label={label}
            >
                <Icon className="size-4" />
            </Button>
        );
    }

    return (
        <Button
            asChild
            variant="outline"
            size="icon"
            className="size-8"
            aria-label={label}
        >
            <Link href={link.url} preserveScroll preserveState>
                <Icon className="size-4" />
            </Link>
        </Button>
    );
}
