import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type Tone = 'primary' | 'success' | 'warning' | 'danger';

const toneClasses: Record<Tone, string> = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-destructive/10 text-destructive',
};

const trendClasses = {
    up: 'text-success',
    down: 'text-destructive',
    flat: 'text-muted-foreground',
} as const;

const trendIcons = {
    up: ArrowUpRight,
    down: ArrowDownRight,
    flat: Minus,
} as const;

export function StatCard({
    label,
    value,
    hint,
    icon: Icon,
    tone = 'primary',
    trend,
    loading = false,
    className,
}: {
    label: string;
    value: ReactNode;
    hint?: ReactNode;
    icon?: LucideIcon;
    tone?: Tone;
    trend?: {
        label: string;
        direction?: keyof typeof trendClasses;
        /** Whether an upward movement is a good thing. */
        positive?: boolean;
    };
    loading?: boolean;
    className?: string;
}) {
    if (loading) {
        return (
            <Card className={cn('shadow-xs', className)}>
                <CardContent className="flex items-start justify-between gap-4 p-5">
                    <div className="flex-1 space-y-3">
                        <Skeleton className="h-3.5 w-24" />
                        <Skeleton className="h-7 w-32" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="size-11 rounded-xl" />
                </CardContent>
            </Card>
        );
    }

    const direction = trend?.direction ?? 'up';
    const TrendIcon = trendIcons[direction];
    const trendIsGood =
        direction === 'flat'
            ? undefined
            : (trend?.positive ?? direction === 'up');

    return (
        <Card className={cn('shadow-xs', className)}>
            <CardContent className="flex items-start justify-between gap-4 p-5">
                <div className="min-w-0 space-y-1.5">
                    <p className="truncate text-[13px] font-medium text-muted-foreground">
                        {label}
                    </p>
                    <p className="text-2xl font-semibold tracking-tight break-words text-foreground">
                        {value}
                    </p>
                    {trend && (
                        <p
                            className={cn(
                                'flex items-center gap-1 text-xs font-medium',
                                trendClasses[direction],
                            )}
                        >
                            <TrendIcon className="size-3.5" />
                            {trend.label}
                        </p>
                    )}
                    {!trend && hint && (
                        <p className="truncate text-xs text-muted-foreground">
                            {hint}
                        </p>
                    )}
                </div>
                {Icon && (
                    <div
                        className={cn(
                            'flex size-11 shrink-0 items-center justify-center rounded-xl',
                            trendIsGood === false
                                ? toneClasses.danger
                                : toneClasses[tone],
                        )}
                    >
                        <Icon className="size-5" />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
