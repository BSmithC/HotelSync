import { cn } from '@/lib/utils';

const styles: Record<string, string> = {
    Pendiente:
        'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    Confirmada:
        'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    'En curso': 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
    Finalizada:
        'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
    Cancelada: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
    Pagada: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    Anulada: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
    Activo: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    Inactivo: 'bg-muted text-muted-foreground',
};

export function StatusBadge({
    status,
    active = true,
}: {
    status: string;
    active?: boolean;
}) {
    const label = active ? status : 'Inactivo';

    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                styles[label] ?? 'bg-muted text-muted-foreground',
            )}
        >
            {label}
        </span>
    );
}
