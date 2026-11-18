import { useForm } from '@inertiajs/react';
import { CheckCircle2, PlayCircle } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { update as updateIncident } from '@/routes/reception/incidents';
import type { ReceptionIncident } from '@/types';

/**
 * Advances an incident to "en proceso" or closes it with a resolution.
 */
export function IncidentActionDialog({
    incident,
    action,
    onClose,
}: {
    incident: ReceptionIncident | null;
    action: 'en_proceso' | 'resuelta';
    onClose: () => void;
}) {
    const { data, setData, patch, processing, errors, reset } = useForm({
        status: action,
        resolution: '',
    });

    useEffect(() => {
        if (incident !== null) {
            setData({ status: action, resolution: '' });
        }

        return () => reset();
    }, [incident, action, setData, reset]);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (incident === null) {
            return;
        }

        patch(updateIncident(incident.id).url, {
            preserveScroll: true,
            onSuccess: () => onClose(),
        });
    };

    const resolving = action === 'resuelta';

    return (
        <Dialog
            open={incident !== null}
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {resolving ? (
                            <CheckCircle2 className="size-4 text-success" />
                        ) : (
                            <PlayCircle className="size-4 text-primary" />
                        )}
                        {resolving ? 'Resolver incidencia' : 'Iniciar atención'}
                    </DialogTitle>
                    <DialogDescription>
                        {incident ? incident.title : undefined}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="incident-resolution">
                            {resolving
                                ? 'Solución aplicada'
                                : 'Nota de seguimiento (opcional)'}
                        </Label>
                        <Textarea
                            id="incident-resolution"
                            value={data.resolution}
                            onChange={(event) =>
                                setData('resolution', event.target.value)
                            }
                            placeholder={
                                resolving
                                    ? 'Describe cómo se resolvió la incidencia.'
                                    : 'Ej. Se avisó a mantenimiento.'
                            }
                            rows={4}
                        />
                        {errors.resolution && (
                            <p className="text-sm text-destructive">
                                {errors.resolution}
                            </p>
                        )}
                        {errors.status && (
                            <p className="text-sm text-destructive">
                                {errors.status}
                            </p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={processing}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                processing ||
                                (resolving && data.resolution.trim() === '')
                            }
                        >
                            {processing
                                ? 'Guardando...'
                                : resolving
                                  ? 'Cerrar incidencia'
                                  : 'Iniciar atención'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
