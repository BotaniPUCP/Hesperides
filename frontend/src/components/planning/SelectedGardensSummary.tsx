'use client';

import { gardensLabel } from './planningTexts';

/** Hasta aquí un sector se muestra abierto; con más jardines empieza plegado. */
const OPEN_UP_TO = 12;

const byName = (a: string, b: string) => a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' });

/**
 * Los jardines elegidos, un sector por fila. Cada fila dice cuántos jardines
 * tiene y se despliega para verlos; así un conjunto de cientos de jardines no
 * se vuelve un párrafo de códigos.
 */
export function SelectedGardensSummary({ bySector }: { bySector: [string, string[]][] }) {
  if (bySector.length === 0) return null;
  return (
    <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
      {bySector.map(([sector, gardens]) => (
        <li key={sector}>
          <details open={gardens.length <= OPEN_UP_TO} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-neutral-50">
              <span className="flex items-center gap-2 font-medium text-neutral-900">
                <span aria-hidden="true" className="text-neutral-400 transition-transform group-open:rotate-90">›</span>
                {sector}
              </span>
              <span className="whitespace-nowrap rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">
                {gardensLabel(gardens.length)}
              </span>
            </summary>
            <ul className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto px-3 pb-3 pt-1">
              {/* Hay jardines con el mismo nombre en el mapa (dos «B 13»): la clave lleva la posición. */}
              {[...gardens].sort(byName).map((garden, i) => (
                <li key={`${garden}-${i}`} className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs text-neutral-700">
                  {garden}
                </li>
              ))}
            </ul>
          </details>
        </li>
      ))}
    </ul>
  );
}
