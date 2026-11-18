<?php

namespace App\Models;

use App\Models\Concerns\BelongsToHotel;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * Append-only record of sensitive or traceable operations.
 *
 * It is shared by every module: reception movements, financial operations,
 * inventory movements, service requests and employee activity.
 *
 * @property int $id
 * @property int|null $hotel_id
 * @property int|null $user_id
 * @property string $module
 * @property string $action
 * @property string|null $subject_type
 * @property int|null $subject_id
 * @property string|null $description
 * @property array<string, mixed>|null $changes
 * @property string|null $ip
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property-read User|null $user
 */
class AuditLog extends Model
{
    use BelongsToHotel;

    protected $fillable = [
        'hotel_id',
        'user_id',
        'module',
        'action',
        'subject_type',
        'subject_id',
        'description',
        'changes',
        'ip',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'changes' => 'array',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return MorphTo<Model, $this>
     */
    public function subject(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Name of the acting user, or "Sistema" for automated operations.
     */
    public function actorName(): string
    {
        $actor = $this->getRelationValue('user');

        return $actor instanceof User ? $actor->name : 'Sistema';
    }
}
