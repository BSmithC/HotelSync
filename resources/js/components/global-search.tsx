import { router } from '@inertiajs/react';
import { ChevronDown, Search } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type Scope = 'clients' | 'reservations' | 'bills';

const scopes: { value: Scope; label: string }[] = [
    { value: 'clients', label: 'Huéspedes' },
    { value: 'reservations', label: 'Reservaciones' },
    { value: 'bills', label: 'Facturas' },
];

function ScopeSelect({
    value,
    onChange,
    id,
}: {
    value: Scope;
    onChange: (scope: Scope) => void;
    id: string;
}) {
    return (
        <div className="relative">
            <label className="sr-only" htmlFor={id}>
                Buscar en
            </label>
            <select
                id={id}
                value={value}
                onChange={(event) => onChange(event.target.value as Scope)}
                className="h-8 cursor-pointer appearance-none rounded-md bg-transparent py-0 pr-6 pl-2 text-xs font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                {scopes.map((scope) => (
                    <option key={scope.value} value={scope.value}>
                        {scope.label}
                    </option>
                ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-1.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
    );
}

function SearchForm({
    className,
    onSubmitted,
}: {
    className?: string;
    onSubmitted?: () => void;
}) {
    const [query, setQuery] = useState('');
    const [scope, setScope] = useState<Scope>('clients');

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const term = query.trim();

        if (term === '') {
            return;
        }

        router.get(
            `/${scope}`,
            { search: term },
            { preserveScroll: true, preserveState: true },
        );

        onSubmitted?.();
    };

    return (
        <form
            onSubmit={submit}
            role="search"
            className={cn(
                'flex items-center gap-1 rounded-lg border border-border bg-background py-1 pr-1 pl-3',
                className,
            )}
        >
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <label className="sr-only" htmlFor="global-search-input">
                Buscar
            </label>
            <input
                id="global-search-input"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar en el hotel…"
                autoComplete="off"
                className="h-8 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <span className="h-5 w-px shrink-0 bg-border" />
            <ScopeSelect
                id="global-search-scope"
                value={scope}
                onChange={setScope}
            />
        </form>
    );
}

export function GlobalSearch() {
    const [open, setOpen] = useState(false);

    return (
        <>
            <SearchForm className="hidden w-56 lg:flex xl:w-64" />

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 rounded-lg text-muted-foreground hover:text-foreground lg:hidden"
                        aria-label="Buscar"
                    >
                        <Search className="size-[18px]" />
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Buscar</DialogTitle>
                        <DialogDescription>
                            Consulta huéspedes, reservaciones o facturas del
                            hotel activo.
                        </DialogDescription>
                    </DialogHeader>
                    <SearchForm
                        className="w-full"
                        onSubmitted={() => setOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
}
