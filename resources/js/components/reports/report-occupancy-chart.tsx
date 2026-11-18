import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { ChartTooltip } from '@/components/charts/chart-tooltip';
import { EmptyState } from '@/components/empty-state';
import { formatDate, formatDateShort, formatNumber } from '@/lib/format';
import type { ReportSeriesPoint } from '@/types';

const axisTick = {
    fill: 'var(--muted-foreground)',
    fontSize: 11,
} as const;

/**
 * Daily occupancy derived from active reservations that overlap the period.
 * Cancelled reservations never reach this series.
 */
export function ReportOccupancyChart({ data }: { data: ReportSeriesPoint[] }) {
    const hasData = data.some((point) => point.occupancy > 0);

    if (!hasData) {
        return (
            <EmptyState
                title="Sin ocupación en el período"
                description="Las reservas activas del período alimentan esta serie."
            />
        );
    }

    return (
        <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                    <defs>
                        <linearGradient
                            id="report-occupancy"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop
                                offset="5%"
                                stopColor="var(--primary)"
                                stopOpacity={0.4}
                            />
                            <stop
                                offset="95%"
                                stopColor="var(--primary)"
                                stopOpacity={0}
                            />
                        </linearGradient>
                    </defs>
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                        vertical={false}
                    />
                    <XAxis
                        dataKey="date"
                        tick={axisTick}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={24}
                        tickFormatter={(value: string) =>
                            formatDateShort(value)
                        }
                    />
                    <YAxis
                        width={44}
                        domain={[0, 100]}
                        tick={axisTick}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value: number) => `${value}%`}
                    />
                    <Tooltip
                        cursor={{ stroke: 'var(--border)' }}
                        content={
                            <ChartTooltip
                                formatLabel={(label) =>
                                    typeof label === 'string'
                                        ? formatDate(label)
                                        : String(label ?? '')
                                }
                                formatValue={(value) =>
                                    `${formatNumber(value)}%`
                                }
                            />
                        }
                    />
                    <Area
                        type="monotone"
                        dataKey="occupancy"
                        name="Ocupación"
                        stroke="var(--primary)"
                        strokeWidth={2}
                        fill="url(#report-occupancy)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
