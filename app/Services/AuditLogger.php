<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Support\CurrentHotel;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;

/**
 * Writes traceable records for sensitive operations.
 *
 * Every module uses this service instead of inserting rows directly so the
 * hotel, the acting user, the IP and the sanitisation rules stay consistent.
 */
class AuditLogger
{
    /**
     * Attribute names that must never be persisted in the audit trail.
     *
     * @var list<string>
     */
    private const HIDDEN_KEYS = [
        'password',
        'password_confirmation',
        'current_password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
    ];

    /**
     * Record an operation.
     *
     * @param  array<string, mixed>  $changes
     */
    public function record(
        string $module,
        string $action,
        ?Model $subject = null,
        ?string $description = null,
        array $changes = [],
    ): AuditLog {
        $changes = $this->scrub($changes);

        return AuditLog::create([
            'hotel_id' => app(CurrentHotel::class)->id(),
            'user_id' => Auth::id(),
            'module' => $module,
            'action' => $action,
            'subject_type' => $subject?->getMorphClass(),
            'subject_id' => $subject?->getKey(),
            'description' => $description,
            'changes' => $changes === [] ? null : $changes,
            'ip' => app()->bound('request') ? request()->ip() : null,
        ]);
    }

    /**
     * Record the changes detected on an already saved model.
     *
     * Usage: capture `$model->getOriginal()` before saving, then pass the
     * result of `$model->getChanges()` here.
     *
     * @param  array<string, mixed>  $changes
     */
    public function recordChanges(
        string $module,
        string $action,
        Model $subject,
        array $changes,
        ?string $description = null,
    ): AuditLog {
        return $this->record(
            module: $module,
            action: $action,
            subject: $subject,
            description: $description,
            changes: $changes,
        );
    }

    /**
     * Remove sensitive attributes from the payload, recursively.
     *
     * @param  array<string, mixed>  $changes
     * @return array<string, mixed>
     */
    private function scrub(array $changes): array
    {
        $filtered = Arr::except($changes, self::HIDDEN_KEYS);

        foreach ($filtered as $key => $value) {
            if (! is_array($value)) {
                continue;
            }

            $filtered[$key] = $this->scrub($value);
        }

        return $filtered;
    }
}
