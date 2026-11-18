import { Link } from '@inertiajs/react';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/types';

export type NavGroup = {
    label: string;
    items: NavItem[];
};

const fallbackLabel = 'Navegación';

const itemClassName =
    "relative h-10 gap-3 rounded-lg px-3 text-[13px] font-medium text-sidebar-foreground/75 transition-colors before:absolute before:top-1/2 before:left-0 before:h-4 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-primary before:opacity-0 before:transition-opacity before:content-[''] hover:bg-white/5 hover:text-white data-[active=true]:bg-white/10 data-[active=true]:font-semibold data-[active=true]:text-white data-[active=true]:before:opacity-100 data-[active=true]:hover:bg-white/10 [&>svg]:size-[18px] [&>svg]:text-sidebar-foreground/55 [&>svg]:transition-colors data-[active=true]:[&>svg]:text-white";

export function NavMain({
    groups = [],
    items = [],
}: {
    groups?: NavGroup[];
    items?: NavItem[];
}) {
    const { isCurrentUrl } = useCurrentUrl();
    const sections =
        groups.length > 0 ? groups : [{ label: fallbackLabel, items }];

    return (
        <>
            {sections.map((section) => (
                <SidebarGroup key={section.label} className="px-2 py-1.5">
                    <SidebarGroupLabel className="mb-1 h-6 px-3 text-[10px] font-semibold tracking-[0.16em] text-sidebar-foreground/35 uppercase">
                        {section.label}
                    </SidebarGroupLabel>
                    <SidebarMenu className="gap-0.5">
                        {section.items.map((item) => {
                            const content = (
                                <>
                                    {item.icon && <item.icon />}
                                    <span className="truncate group-data-[collapsible=icon]:hidden">
                                        {item.title}
                                    </span>
                                    {item.badge && (
                                        <span className="ml-auto rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden">
                                            {item.badge}
                                        </span>
                                    )}
                                </>
                            );

                            return (
                                <SidebarMenuItem key={item.title}>
                                    {item.disabled ? (
                                        <SidebarMenuButton
                                            type="button"
                                            disabled
                                            aria-disabled="true"
                                            tooltip={{
                                                children: `${item.title} · ${item.badge ?? 'Próximamente'}`,
                                            }}
                                            className={cn(
                                                itemClassName,
                                                'cursor-not-allowed opacity-45 hover:bg-transparent hover:text-sidebar-foreground/75 [&>svg]:text-sidebar-foreground/40',
                                            )}
                                        >
                                            {content}
                                        </SidebarMenuButton>
                                    ) : (
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isCurrentUrl(item.href)}
                                            tooltip={{ children: item.title }}
                                            className={itemClassName}
                                        >
                                            <Link href={item.href} prefetch>
                                                {content}
                                            </Link>
                                        </SidebarMenuButton>
                                    )}
                                </SidebarMenuItem>
                            );
                        })}
                    </SidebarMenu>
                </SidebarGroup>
            ))}
        </>
    );
}
