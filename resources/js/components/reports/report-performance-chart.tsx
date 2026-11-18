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
    formatDate,
    formatDateShort,
} from '@/lib/format';
import type { ReportSeriesPoint } from '@/types';

const axisTick = {
    fill: 'var(--muted-foreground)',
    fontSize: 11,
} as const;

/**
 * Daily evolution of the three independent money figures. Invoices are not
 * collections, so each series is drawn on its own instead of being stacked.
 */
export function ReportPerformanceChart({
    data,
    currency,
}: {
    data: ReportSeriesPoint[];
    currency: string;
}) {
    const hasData = data.some(
        (point) =>
            point.invoiced > 0 || point.collected > 0 || point.expenses > 0,
    );

    if (!hasData) {
        return (
            <EmptyState
                title="Sin movimientos en el período"
                description="Registra facturas, cobros o gastos para ver su evolución diaria."
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
                            id="report-invoiced"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop
                                offset="5%"
                                stopColor="var(--primary)"
                                stopOpacity={0.35}
                            />
                            <stop
                                offset="95%"
                                stopColor="var(--primary)"
                                stopOpacity={0}
                            />
                        </linearGradient>
                        <linearGradient
                            id="report-collected"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop
                                offset="5%"
                                stopColor="var(--success)"
                                stopOpacity={0.35}
                            />
                            <stop
                                offset="95%"
                                stopColor="var(--success)"
                                stopOpacity={0}
                            />
                        </linearGradient>
                        <linearGradient
                            id="report-expenses"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop
                                offset="5%"
                                stopColor="var(--destructive)"
                                stopOpacity={0.3}
                            />
                            <stop
                                offset="95%"
                                stopColor="var(--destructive)"
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
                                formatLabel={(label) =>
                                    typeof label === 'string'
                                        ? formatDate(label)
                                        : String(label ?? '')
                                }
                                formatValue={(value) =>
                                    formatCurrency(value, currency)
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
                        fill="url(#report-invoiced)"
                    />
                    <Area
                        type="monotone"
                        dataKey="collected"
                        name="Cobrado"
                        stroke="var(--success)"
                        strokeWidth={2}
                        fill="url(#report-collected)"
                    />
                    <Area
                        type="monotone"
                        dataKey="expenses"
                        name="Gastos"
                        stroke="var(--destructive)"
                        strokeWidth={2}
                        fill="url(#report-expenses)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
