'use client';

import { LoadingSkeleton } from '@/components/ui';
import { useRequest } from '@/hooks/useRequest';
import { greenAreaSetsApi } from '@/lib/green-area-sets-api';
import { GreenAreaSetEditor, type SetOptions } from './GreenAreaSetEditor';

/** Lo que el editor necesita para elegir: secciones por sector y ejemplares. */
async function loadOptions(): Promise<SetOptions> {
  const [groups, specimens] = await Promise.all([greenAreaSetsApi.sectionOptions(), greenAreaSetsApi.elementOptions()]);
  return {
    sectors: groups.map(({ id, code, name }) => ({ id, code, name })),
    specimens,
    sectionsBySector: Object.fromEntries(groups.map((s) => [s.id, s.sections])),
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
