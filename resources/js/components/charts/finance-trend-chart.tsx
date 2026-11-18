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
import { formatCompactCurrency, formatCurrency } from '@/lib/format';
import type { FinanceSeriesPoint } from '@/types';

const axisTick = {
    fill: 'var(--muted-foreground)',
    fontSize: 11,
} as const;

/**
 * Six-month comparison of invoiced, collected and expenses. Amounts are
 * independent totals; the chart never sums the same operation twice.
 */
export function FinanceTrendChart({
    data,
    currency,
}: {
    data: FinanceSeriesPoint[];
    currency: string;
}) {
    const hasData = data.some(
        (point) =>
            point.invoiced > 0 || point.collected > 0 || point.expenses > 0,
    );

    if (!hasData) {
        return (
            <EmptyState
                title="Sin movimientos en los últimos seis meses"
                description="Cuando registres facturas, cobros o gastos verás aquí su evolución mensual."
            />
        );
    }

    return (
        <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    barGap={4}
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                        vertical={false}
                    />
                    <XAxis
                        dataKey="label"
                        tick={axisTick}
                        tickLine={false}
                        axisLine={false}
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
                        cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                        content={
                            <ChartTooltip
                                formatValue={(value) =>
                                    formatCurrency(value, currency)
                                }
                            />
                        }
                    />
                    <Bar
                        dataKey="invoiced"
                        name="Facturado"
                        fill="var(--primary)"
                        radius={[4, 4, 0, 0]}
                    />
                    <Bar
                        dataKey="collected"
                        name="Cobrado"
                        fill="var(--success)"
                        radius={[4, 4, 0, 0]}
                    />
                    <Bar
                        dataKey="expenses"
                        name="Gastos"
                        fill="var(--destructive)"
                        radius={[4, 4, 0, 0]}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
