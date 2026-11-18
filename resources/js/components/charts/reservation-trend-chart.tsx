import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { ChartTooltip } from '@/components/charts/chart-tooltip';
import { EmptyState } from '@/components/empty-state';
import { formatDateShort, formatNumber } from '@/lib/format';
import type { DashboardTrendPoint } from '@/types';

const axisTick = {
    fill: 'var(--muted-foreground)',
    fontSize: 11,
} as const;

export function ReservationTrendChart({
    data,
}: {
    data: DashboardTrendPoint[];
}) {
    const hasData = data.some((point) => point.count > 0);

    if (!hasData) {
        return (
            <EmptyState
                title="Sin reservaciones recientes"
                description="Las reservaciones creadas en los últimos 14 días aparecerán aquí."
            />
        );
    }

    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
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
                        minTickGap={16}
                        tickFormatter={(value: string) =>
                            formatDateShort(value)
                        }
                    />
                    <YAxis
                        width={32}
                        allowDecimals={false}
                        tick={axisTick}
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip
                        cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                        content={
                            <ChartTooltip
                                formatValue={(value) =>
                                    `${formatNumber(value)} reservas`
                                }
                                formatLabel={(value) =>
                                    formatDateShort(
                                        value === undefined
                                            ? undefined
                                            : String(value),
                                    )
                                }
                            />
                        }
                    />
                    <Bar
                        dataKey="count"
                        name="Reservaciones"
                        fill="var(--primary)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={32}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
