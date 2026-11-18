import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import type { User } from '@/types';

export function UserInfo({
    user,
    showEmail = false,
    variant = 'default',
}: {
    user: User;
    showEmail?: boolean;
    variant?: 'default' | 'sidebar';
}) {
    const getInitials = useInitials();
    const isSidebar = variant === 'sidebar';

    return (
        <>
            <Avatar className="h-8 w-8 overflow-hidden rounded-full">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback
                    className={cn(
                        'rounded-full text-xs font-semibold',
                        isSidebar
                            ? 'bg-white/10 text-white'
                            : 'bg-primary/10 text-primary',
                    )}
                >
                    {getInitials(user.name)}
                </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                {showEmail && (
                    <span
                        className={cn(
                            'truncate text-xs',
                            isSidebar
                                ? 'text-sidebar-foreground/55'
                                : 'text-muted-foreground',
                        )}
                    >
                        {user.email}
                    </span>
                )}
            </div>
        </>
    );
}
