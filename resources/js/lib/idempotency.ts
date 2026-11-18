/**
 * Stable key for double-submit protection. The server stores it per hotel and
 * returns the existing record when the same operation is retried.
 */
export function createIdempotencyKey(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
