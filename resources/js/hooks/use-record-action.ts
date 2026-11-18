import { router } from '@inertiajs/react';
import { useState } from 'react';
import type { RouteDefinition } from '@/wayfinder';

export type RecordAction = 'delete' | 'restore';

export type PendingRecordAction = {
    id: number;
    action: RecordAction;
    name: string;
};

/**
 * Handles the confirmation flow for deactivating or restoring a record
 * without duplicating the same state machine on every list page.
 */
export function useRecordAction({
    destroy,
    restore,
}: {
    destroy: (id: number) => RouteDefinition<'delete'>;
    restore: (id: number) => RouteDefinition<'patch'>;
}) {
    const [pending, setPending] = useState<PendingRecordAction | null>(null);
    const [processing, setProcessing] = useState(false);

    const confirm = () => {
        if (pending === null) {
            return;
        }

        const options = {
            preserveScroll: true,
            onStart: () => setProcessing(true),
            onFinish: () => {
                setProcessing(false);
                setPending(null);
            },
        };

        if (pending.action === 'delete') {
            router.delete(destroy(pending.id), options);
        } else {
            router.patch(restore(pending.id), {}, options);
        }
    };

    return {
        pending,
        processing,
        request: (record: PendingRecordAction) => setPending(record),
        close: () => setPending(null),
        confirm,
    };
}
