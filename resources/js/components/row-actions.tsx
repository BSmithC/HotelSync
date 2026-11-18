import { Link } from '@inertiajs/react';
import { MoreHorizontal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { RouteDefinition } from '@/wayfinder';

export type RowAction = {
    label: string;
    icon: LucideIcon;
    href?: string | RouteDefinition<'get'>;
    onSelect?: () => void;
    destructive?: boolean;
    success?: boolean;
};

/**
 * Stable row menu used by every list index. Navigation actions render as
 * links; destructive or restorative actions call the provided callback.
 */
export function RowActions({ actions }: { actions: RowAction[] }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label="Abrir menú de acciones"
                >
                    <MoreHorizontal className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {actions.map((action) => {
                    const Icon = action.icon;

                    if (action.href) {
                        return (
                            <DropdownMenuItem
                                key={action.label}
                                asChild
                                className="cursor-pointer"
                            >
                                <Link href={action.href}>
                                    <Icon className="size-4" />
                                    {action.label}
                                </Link>
                            </DropdownMenuItem>
                        );
                    }

                    return (
                        <DropdownMenuItem
                            key={action.label}
                            onClick={action.onSelect}
                            className={cn(
                                'cursor-pointer',
                                action.destructive &&
                                    'text-destructive focus:text-destructive',
                                action.success &&
                                    'text-success focus:text-success',
                            )}
                        >
                            <Icon className="size-4" />
                            {action.label}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
