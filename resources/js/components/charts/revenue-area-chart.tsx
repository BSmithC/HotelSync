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
import {
    formatCompactCurrency,
    formatCurrency,
    formatDateShort,
} from '@/lib/format';
import type { DashboardRevenuePoint } from '@/types';

const axisTick = {
    fill: 'var(--muted-foreground)',
    fontSize: 11,
} as const;

export function RevenueAreaChart({
    data,
    currency,
}: {
    data: DashboardRevenuePoint[];
    currency: string;
}) {
    const hasData = data.some((point) => point.invoiced > 0 || point.paid > 0);

    if (!hasData) {
        return (
            <EmptyState
                title="Sin facturación en los últimos 30 días"
                description="Cuando se emitan facturas verás aquí lo facturado y lo cobrado por día."
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
                            id="dashboard-revenue-invoiced"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop
                                offset="5%"
                                stopColor="var(--primary)"
                                stopOpacity={0.3}
                            />
                            <stop
                                offset="95%"
                                stopColor="var(--primary)"
                                stopOpacity={0}
                            />
                        </linearGradient>
                        <linearGradient
                            id="dashboard-revenue-paid"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop
                                offset="5%"
                                stopColor="var(--success)"
                                stopOpacity={0.25}
                            />
                            <stop
                                offset="95%"
                                stopColor="var(--success)"
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
                        width={72}
                        tick={axisTick}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value: number) =>
                            formatCompactCurrency(value, currency)
                        }
                    />
                    <Tooltip
                        cursor={{ stroke: 'var(--border)' }}
                        content={
                            <ChartTooltip
                                formatValue={(value) =>
                                    formatCurrency(value, currency)
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
                    <Area
                        type="monotone"
                        dataKey="invoiced"
                        name="Facturado"
                        stroke="var(--primary)"
                        strokeWidth={2}
                        fill="url(#dashboard-revenue-invoiced)"
                    />
                    <Area
                        type="monotone"
                        dataKey="paid"
                        name="Cobrado"
                        stroke="var(--success)"
                        strokeWidth={2}
                        fill="url(#dashboard-revenue-paid)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
