'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { GreenAreaSetSummary, MaintenanceScope } from '@shared/types';
import { FROM_FREQUENCY, SETS_PATH } from '@/components/planning/GreenAreaSetsScreen';
import { contentsLabel } from '@/components/planning/planningTexts';
import { greenAreaSetsApi } from '@/lib/green-area-sets-api';

const SELECT = 'w-full rounded-md border border-neutral-300 bg-neutral-0 px-3 py-2 text-sm focus:border-primary-500 focus:outline-hidden';
const LABEL = 'mb-1 block text-sm font-medium text-neutral-700';
/** Flecha como texto, no como emoji: indica que se abre en otra pestaña. */
const ARROW = '↗︎';
const LINK = 'font-medium text-brand-700 underline underline-offset-2 hover:text-brand-900';

interface Props {
  scope: MaintenanceScope;
  setId: number | null;
  sets: GreenAreaSetSummary[];
  onScope: (scope: MaintenanceScope) => void;
  onSet: (id: number | null) => void;
}

const contents = (set: GreenAreaSetSummary) => (set.zoneCount + set.elementCount === 0 ? 'vacío' : contentsLabel(set.zoneCount, set.elementCount));

/** A qué se aplica una frecuencia: todo el campus o un conjunto guardado (SPEC-203 D-07). */
export function FrequencyScopeFields({ scope, setId, sets, onScope, onSet }: Props) {
  // Si se crea un conjunto en otra pestaña, al volver se recarga la lista y, si no había uno elegido, queda elegido.
  const [fresh, setFresh] = useState<GreenAreaSetSummary[] | null>(null);
  const known = useRef(new Set<number>());
  const options = fresh ?? sets;
  const chosen = options.find((s) => s.id === setId);

  useEffect(() => { sets.forEach((s) => known.current.add(s.id)); }, [sets]);
  useEffect(() => {
    if (scope !== 'BY_SET') return undefined;
    const refresh = () => {
      greenAreaSetsApi.list().then((list) => {
        const added = list.filter((s) => !known.current.has(s.id));
        list.forEach((s) => known.current.add(s.id));
        setFresh(list);
        if (added.length === 1 && setId == null) onSet(added[0].id);
      }).catch(() => undefined);
    };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [scope, setId, onSet]);

  return (
    <>
      <div>
        <label htmlFor="frequency-scope" className={LABEL}>Se aplica a</label>
        <select id="frequency-scope" value={scope} onChange={(e) => onScope(e.target.value as MaintenanceScope)} className={SELECT}>
          <option value="CAMPUS_WIDE">Todo el campus</option>
          <option value="BY_SET">Un conjunto de áreas verdes</option>
        </select>
      </div>
      {scope === 'BY_SET' && (
        <div className="sm:col-span-2">
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3">
            <label htmlFor="frequency-set" className="text-sm font-medium text-neutral-700">Conjunto de áreas verdes</label>
            {/* Otra pestaña: navegar aquí cerraría el formulario y se perdería lo escrito. */}
            <span className="flex gap-3 text-xs">
              {chosen && <Link href={`${SETS_PATH}/${chosen.id}`} target="_blank" rel="noopener" className={LINK}>
                Ver conjunto {ARROW}<span className="sr-only"> (se abre en otra pestaña)</span></Link>}
              <Link href={`${SETS_PATH}/nuevo?desde=${FROM_FREQUENCY}`} target="_blank" rel="noopener" className={LINK}>
                {options.length === 0 ? 'Crear el primer conjunto' : 'Crear conjunto'} {ARROW}<span className="sr-only"> (se abre en otra pestaña)</span></Link>
            </span>
          </div>
          <select id="frequency-set" value={setId ?? 0} onChange={(e) => onSet(Number(e.target.value) || null)} className={SELECT}>
            <option value={0}>{options.length === 0 ? 'Todavía no hay conjuntos' : 'Elige un conjunto…'}</option>
            {options.map((s) => <option key={s.id} value={s.id}>{s.name} · {contents(s)}</option>)}
          </select>
          <span className="mt-1 block text-xs text-neutral-500">
            Grupo de jardines y ejemplares. Esta frecuencia reemplaza a la del campus solo para ellos.
          </span>
        </div>
      )}
    </>
  );
}
