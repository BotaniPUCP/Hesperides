'use client';

import type { CreateMaintenanceFrequencyRequest, MaintenanceFrequency, UpdateMaintenanceFrequencyRequest } from '@shared/types';
import { PageHeader } from '@/components/layouts/PageHeader';
import { LoadingSkeleton } from '@/components/ui';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useRequest } from '@/hooks/useRequest';
import { maintenanceApi } from '@/lib/maintenance-api';
import { FrequencyForm } from './FrequencyForm';
import { saveFrequencyFlash } from './frequencyListState';
import { planningsLabel } from './FrequencyScopeFields';

async function loadForm(frequencyId: number | null) {
  const [activities, ruleTypes, frequency] = await Promise.all([
    maintenanceApi.getActivityTypes(),
    maintenanceApi.getRuleTypes(),
    frequencyId == null ? Promise.resolve(null) : maintenanceApi.getById(frequencyId),
  ]);
  return { activities, ruleTypes, frequency };
}

/** La página de una frecuencia: nueva o una existente para editarla o desactivarla (SPEC-203). */
export function FrequencyFormScreen({ frequencyId = null }: { frequencyId?: number | null }) {
  const data = useRequest(`frequency-form:${frequencyId ?? 'nueva'}`, () => loadForm(frequencyId));
  const editing = data.data?.frequency ?? null;
  const { ask, dialog } = useConfirmDialog();

  const submit = async (payload: CreateMaintenanceFrequencyRequest | UpdateMaintenanceFrequencyRequest) => {
    if (editing) {
      const saved = await maintenanceApi.update(editing.id, payload as UpdateMaintenanceFrequencyRequest);
      // Editar versiona: la anterior queda cerrada y esta rige desde hoy.
      saveFrequencyFlash({ type: 'success', warnings: saved.warnings,
        message: 'Se creó una versión nueva. Los periodos ya evaluados conservan la anterior.' });
    } else {
      const saved = await maintenanceApi.create(payload as CreateMaintenanceFrequencyRequest);
      saveFrequencyFlash({ type: 'success', message: 'Frecuencia registrada', warnings: saved.warnings });
    }
  };

  /** Devuelve si se desactivó, para que el formulario sepa si volver a la lista. */
  const deactivate = async (f: MaintenanceFrequency): Promise<boolean> => {
    const confirmed = await ask({
      title: 'Desactivar frecuencia',
      confirmLabel: 'Desactivar',
      message: <>
        <p>«{f.activityType.label}» dejará de regir. Se conserva para no perder el historial.</p>
        {f.assignedSetCount > 0 && <p>Se usa en {planningsLabel(f.assignedSetCount)}: quedarán sin frecuencia hasta que les elijas otra.</p>}
      </>,
    });
    if (!confirmed) return false;
    try {
      await maintenanceApi.delete(f.id);
      saveFrequencyFlash({ type: 'success', message: 'Frecuencia desactivada y retirada de la lista activa.' });
      return true;
    } catch {
      saveFrequencyFlash({ type: 'error', message: 'No se pudo desactivar la frecuencia' });
      return true;
    }
  };

  const title = frequencyId == null ? 'Nueva frecuencia' : editing ? `Editar frecuencia · ${editing.activityType.label}` : 'Editar frecuencia';
  return (
    <section className="space-y-6">
      <PageHeader title={title}
        description={frequencyId == null ? 'Cada cuánto se hace una actividad, en todo el campus o solo en algunas áreas.' : undefined} />
      {data.errorMessage && <p role="alert" className="text-sm text-action-danger">{data.errorMessage}</p>}
      {!data.data && !data.errorMessage && <LoadingSkeleton />}
      {data.data && (frequencyId == null || editing) && (
        <FrequencyForm frequencyToEdit={editing} activities={data.data.activities} ruleTypes={data.data.ruleTypes}
          onSubmit={submit} onDeactivate={editing ? deactivate : undefined} />
      )}
      {dialog}
    </section>
  );
}
