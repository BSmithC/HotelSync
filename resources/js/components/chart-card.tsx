import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function ChartCard({
    title,
    description,
    actions,
    children,
    loading = false,
    className,
    contentClassName,
}: {
    title: string;
    description?: string;
    actions?: ReactNode;
    children: ReactNode;
    loading?: boolean;
    className?: string;
    contentClassName?: string;
}) {
    return (
        <Card className={cn('shadow-xs', className)}>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 p-5 pb-0">
                <div className="min-w-0 space-y-1">
                    <h2 className="text-sm font-semibold text-foreground">
                        {title}
                    </h2>
                    {description && (
                        <p className="text-xs text-muted-foreground">
                            {description}
                        </p>
                    )}
                </div>
                {actions && (
                    <div className="flex shrink-0 items-center gap-1">
                        {actions}
                    </div>
                )}
            </CardHeader>
            <CardContent className={cn('p-5', contentClassName)}>
                {loading ? (
                    <div className="space-y-3" aria-hidden="true">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-56 w-full rounded-lg" />
                    </div>
                ) : (
                    children
                )}
            </CardContent>
        </Card>
    );
}
