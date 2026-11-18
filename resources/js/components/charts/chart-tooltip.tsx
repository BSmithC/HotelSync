export type ChartTooltipEntry = {
    name?: string | number;
    value?: number | string;
    color?: string;
    dataKey?: string | number;
};

export type ChartTooltipProps = {
    active?: boolean;
    payload?: ChartTooltipEntry[];
    label?: string | number;
    formatValue?: (value: number | string | undefined) => string;
    formatLabel?: (label: string | number | undefined) => string;
};

/**
 * Shared tooltip used by every dashboard chart so the visual language stays
 * consistent. Recharts clones this element and injects `active`, `payload`
 * and `label` at runtime.
 */
export function ChartTooltip({
    active,
    payload,
    label,
    formatValue,
    formatLabel,
}: ChartTooltipProps) {
    if (!active || !payload?.length) {
        return null;
    }

    return (
        <div className="min-w-40 rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
            {label !== undefined && (
                <p className="mb-1.5 font-semibold text-foreground">
                    {formatLabel ? formatLabel(label) : label}
                </p>
            )}
            <div className="space-y-1">
                {payload.map((entry, index) => (
                    <div
                        key={`${entry.dataKey ?? entry.name ?? 'item'}-${index}`}
                        className="flex items-center gap-2"
                    >
                        <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-muted-foreground">
                            {entry.name}
                        </span>
                        <span className="ml-auto font-semibold text-foreground">
                            {formatValue
                                ? formatValue(entry.value)
                                : entry.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
