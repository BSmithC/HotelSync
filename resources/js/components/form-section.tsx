import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function FormSection({
    title,
    description,
    children,
    className,
}: {
    title?: string;
    description?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section
            className={cn(
                'space-y-4 border-b border-border pb-6 last:border-0 last:pb-0',
                className,
            )}
        >
            {(title || description) && (
                <div className="space-y-1">
                    {title && (
                        <h2 className="text-sm font-semibold text-foreground">
                            {title}
                        </h2>
                    )}
                    {description && (
                        <p className="text-sm text-muted-foreground">
                            {description}
                        </p>
                    )}
                </div>
            )}
            {children}
        </section>
    );
}
