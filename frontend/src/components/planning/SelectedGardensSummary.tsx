'use client';

import { contentsLabel } from './planningTexts';

/** Hasta aquí un sector se muestra abierto; con más elementos empieza plegado. */
const OPEN_UP_TO = 12;

const byName = (a: string, b: string) => a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' });

/** Lo elegido en un sector: sus jardines y sus ejemplares, por nombre. */
export interface SectorContents {
  gardens: string[];
  specimens: string[];
}

function Chips({ title, items, square }: { title: string; items: string[]; square: boolean }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-neutral-500">{title}</p>
      <ul className="flex flex-wrap gap-1.5">
        {/* Hay jardines con el mismo nombre en el mapa (dos «B 13»): la clave lleva la posición. */}
        {[...items].sort(byName).map((item, i) => (
          <li key={`${item}-${i}`} className={`border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs text-neutral-700 ${square ? 'rounded-md' : 'rounded-full'}`}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Lo elegido, un sector por fila. Cada fila dice cuántos jardines y ejemplares
 * tiene y se despliega para verlos; así un conjunto de cientos no se vuelve un
 * párrafo de códigos.
 */
export function SelectedGardensSummary({ bySector }: { bySector: [string, SectorContents][] }) {
  if (bySector.length === 0) return null;
  return (
    <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
      {bySector.map(([sector, { gardens, specimens }]) => (
        <li key={sector}>
          <details open={gardens.length + specimens.length <= OPEN_UP_TO} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-neutral-50">
              <span className="flex items-center gap-2 font-medium text-neutral-900">
                <span aria-hidden="true" className="text-neutral-400 transition-transform group-open:rotate-90">›</span>
                {sector}
              </span>
              <span className="whitespace-nowrap rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">
                {contentsLabel(gardens.length, specimens.length)}
              </span>
            </summary>
            <div className="max-h-56 space-y-2 overflow-y-auto px-3 pb-3 pt-1">
              <Chips title="Jardines" items={gardens} square />
              <Chips title="Ejemplares" items={specimens} square={false} />
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
