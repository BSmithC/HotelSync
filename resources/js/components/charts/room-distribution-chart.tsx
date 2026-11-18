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
import { formatNumber } from '@/lib/format';
import type { DashboardAreaCount } from '@/types';

const axisTick = {
    fill: 'var(--muted-foreground)',
    fontSize: 11,
} as const;

export function RoomDistributionChart({
    data,
}: {
    data: DashboardAreaCount[];
}) {
    if (data.length === 0) {
        return (
            <EmptyState
                title="Sin habitaciones registradas"
                description="Crea áreas y habitaciones para ver su distribución por zona."
            />
        );
    }

    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    layout="vertical"
                    margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                        horizontal={false}
                    />
                    <XAxis
                        type="number"
                        allowDecimals={false}
                        tick={axisTick}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        type="category"
                        dataKey="area"
                        width={104}
                        tick={axisTick}
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip
                        cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                        content={
                            <ChartTooltip
                                formatValue={(value) =>
                                    `${formatNumber(value)} habitaciones`
                                }
                            />
                        }
                    />
                    <Bar
                        dataKey="count"
                        name="Habitaciones"
                        fill="var(--chart-4)"
                        radius={[0, 4, 4, 0]}
                        maxBarSize={26}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
