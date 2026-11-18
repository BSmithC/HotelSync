import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartTooltip } from '@/components/charts/chart-tooltip';
import { EmptyState } from '@/components/empty-state';
import { formatNumber } from '@/lib/format';

export type DonutSegment = {
    label: string;
    value: number;
    color: string;
};

export function DonutChart({
    segments,
    emptyTitle,
    emptyDescription,
    unitLabel = '',
}: {
    segments: DonutSegment[];
    emptyTitle: string;
    emptyDescription?: string;
    unitLabel?: string;
}) {
    const total = segments.reduce((sum, segment) => sum + segment.value, 0);
    const visible = segments.filter((segment) => segment.value > 0);

    if (total === 0 || visible.length === 0) {
        return <EmptyState title={emptyTitle} description={emptyDescription} />;
    }

    return (
        <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div className="relative h-44 w-44 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={visible}
                            dataKey="value"
                            nameKey="label"
                            innerRadius={56}
                            outerRadius={82}
                            paddingAngle={2}
                            strokeWidth={0}
                        >
                            {visible.map((segment) => (
                                <Cell
                                    key={segment.label}
                                    fill={segment.color}
                                />
                            ))}
                        </Pie>
                        <Tooltip
                            content={
                                <ChartTooltip
                                    formatValue={(value) =>
                                        `${formatNumber(value)} ${unitLabel}`.trim()
                                    }
                                />
                            }
                        />
                    </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-semibold tracking-tight text-foreground">
                        {formatNumber(total)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                        Total
                    </span>
                </div>
            </div>

            <ul className="w-full flex-1 space-y-2">
                {segments.map((segment) => (
                    <li
                        key={segment.label}
                        className="flex items-center gap-2 text-xs"
                    >
                        <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: segment.color }}
                        />
                        <span className="truncate text-muted-foreground">
                            {segment.label}
                        </span>
                        <span className="ml-auto font-semibold text-foreground">
                            {formatNumber(segment.value)}
                        </span>
                        <span className="w-10 text-right text-muted-foreground">
                            {Math.round((segment.value / total) * 100)}%
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
