'use client';

import { LoadingSkeleton } from '@/components/ui';
import { useRequest } from '@/hooks/useRequest';
import { greenAreaSetsApi } from '@/lib/green-area-sets-api';
import { irrigationApi } from '@/lib/irrigation-api';
import { maintenanceApi } from '@/lib/maintenance-api';
import { GreenAreaSetEditor, type SetOptions } from './GreenAreaSetEditor';

/** Lo que el editor necesita para elegir: actividades y las secciones agrupadas por sector. */
async function loadOptions(): Promise<SetOptions> {
  const [activities, sectors] = await Promise.all([maintenanceApi.getActivityTypes(), irrigationApi.sectors()]);
  const groups = await Promise.all(sectors.map((s) => irrigationApi.sections(s.id)));
  return {
    activities,
    sectors,
    sectionsBySector: Object.fromEntries(sectors.map((s, i) => [s.id, groups[i]])),
  };
}

/** Crear o editar un conjunto (SPEC-203 §5.2). Carga todo antes de mostrar el editor. */
export function GreenAreaSetForm({ setId }: { setId?: number }) {
  const options = useRequest('green-area-set-options', loadOptions);
  const existing = useRequest(setId ? `green-area-set:${setId}` : null, () => greenAreaSetsApi.get(setId!));

  const error = options.errorMessage ?? existing.errorMessage
    ?? (existing.notFound ? 'El conjunto no existe o ya fue dado de baja.' : null);
  if (error) return <p role="alert" className="text-sm text-action-danger">{error}</p>;
  if (!options.data || (setId && !existing.data)) return <LoadingSkeleton />;
  return <GreenAreaSetEditor options={options.data} existing={existing.data} />;
}
