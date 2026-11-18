import { Info, Loader2, RotateCcw, Save } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function SettingsPanel({
    title,
    description,
    dirty,
    children,
    footer,
}: {
    title: string;
    description: string;
    dirty: boolean;
    children: ReactNode;
    footer?: ReactNode;
}) {
    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">
                        {title}
                    </h2>
                    <p className="max-w-2xl text-sm text-muted-foreground">
                        {description}
                    </p>
                </div>
                {dirty && (
                    <Badge
                        variant="outline"
                        className="border-warning/40 bg-warning/10 text-warning"
                    >
                        Cambios sin guardar
                    </Badge>
                )}
            </div>

            <Card className="gap-0 py-0">
                <CardContent className="space-y-6 py-6">{children}</CardContent>
                {footer && (
                    <CardFooter className="border-t py-4">{footer}</CardFooter>
                )}
            </Card>
        </div>
    );
}

/**
 * Explains the real scope of a setting so the UI never promises behavior the
 * backend does not implement.
 */
export function SettingsNotice({
    children,
    tone = 'info',
}: {
    children: ReactNode;
    tone?: 'info' | 'warning';
}) {
    return (
        <div
            className={cn(
                'flex items-start gap-3 rounded-lg border p-3 text-sm',
                tone === 'warning'
                    ? 'border-warning/40 bg-warning/10 text-warning'
                    : 'bg-muted/30 text-muted-foreground',
            )}
        >
            <Info className="mt-0.5 size-4 shrink-0" />
            <div className="min-w-0 leading-relaxed">{children}</div>
        </div>
    );
}

export function SettingsSaveBar({
    dirty,
    processing,
    onDiscard,
    onRestore,
    restoreLabel = 'Restaurar predeterminados',
    restoreDisabled = false,
}: {
    dirty: boolean;
    processing: boolean;
    onDiscard: () => void;
    onRestore?: () => void;
    restoreLabel?: string;
    restoreDisabled?: boolean;
}) {
    return (
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span
                    className={cn(
                        'size-2 rounded-full',
                        dirty ? 'bg-warning' : 'bg-success',
                    )}
                    aria-hidden="true"
                />
                {dirty
                    ? 'Tienes cambios sin guardar'
                    : 'Todos los cambios están guardados'}
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {onRestore && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onRestore}
                        disabled={processing || restoreDisabled}
                    >
                        <RotateCcw className="size-4" />
                        {restoreLabel}
                    </Button>
                )}
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onDiscard}
                    disabled={!dirty || processing}
                >
                    Descartar
                </Button>
                <Button type="submit" size="sm" disabled={!dirty || processing}>
                    {processing ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <Save className="size-4" />
                    )}
                    {processing ? 'Guardando…' : 'Guardar cambios'}
                </Button>
            </div>
        </div>
    );
}
