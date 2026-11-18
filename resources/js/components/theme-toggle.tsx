import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppearance } from '@/hooks/use-appearance';
import type { Appearance } from '@/hooks/use-appearance';

const options: {
    value: Appearance;
    label: string;
    icon: typeof Sun;
}[] = [
    { value: 'light', label: 'Claro', icon: Sun },
    { value: 'dark', label: 'Oscuro', icon: Moon },
    { value: 'system', label: 'Sistema', icon: Monitor },
];

const emptySubscribe = () => () => {};

export function ThemeToggle() {
    const { appearance, resolvedAppearance, updateAppearance } =
        useAppearance();

    // The server renders without access to `matchMedia`, so the first client
    // render must reuse the same icon and only then follow the resolved
    // appearance. `useSyncExternalStore` yields `false` for the server
    // snapshot and `true` once hydrated, without setting state in an effect.
    const mounted = useSyncExternalStore(
        emptySubscribe,
        () => true,
        () => false,
    );

    const CurrentIcon = mounted && resolvedAppearance === 'dark' ? Moon : Sun;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 rounded-lg text-muted-foreground hover:text-foreground"
                    aria-label="Cambiar tema"
                >
                    <CurrentIcon className="size-[18px]" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuLabel className="text-[11px] tracking-wide text-muted-foreground uppercase">
                    Tema
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {options.map((option) => (
                    <DropdownMenuItem
                        key={option.value}
                        onSelect={() => updateAppearance(option.value)}
                        className="gap-2"
                    >
                        <option.icon className="size-4 text-muted-foreground" />
                        <span className="flex-1">{option.label}</span>
                        {appearance === option.value && (
                            <Check className="size-4 text-primary" />
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
