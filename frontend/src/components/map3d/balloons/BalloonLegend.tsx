'use client';

import type { Balloon, BalloonKind } from '@shared/types';
import { KIND_NAME } from './balloonClusters';

/** Los tipos que ya tienen fuente (SPEC-113 §5.1); los demás no aparecen hasta tenerla. */
const KINDS_WITH_SOURCE: { kind: BalloonKind; icon: string }[] = [
  { kind: 'INCIDENT', icon: 'incidencia-alta' },
  { kind: 'IRRIGATION_DUE', icon: 'seccion-por-regar' },
  { kind: 'IRRIGATION', icon: 'riego-en-curso' },
  { kind: 'INTERVENTION', icon: 'intervencion-en-curso' },
  { kind: 'RESERVATION', icon: 'reserva-en-curso' },
  { kind: 'BLOCKING_EVENT', icon: 'evento-bloqueante' },
];

export interface BalloonLegendProps {
  on: boolean;
  balloons: readonly Balloon[];
  unavailableKinds: readonly BalloonKind[];
  onToggle: (on: boolean) => void;
}

/** El interruptor «Globos» y, debajo, cada tipo con su dibujo y cuántos hay ahora (SPEC-113 §7.3). */
export function BalloonLegend({ on, balloons, unavailableKinds, onToggle }: BalloonLegendProps) {
  const missing = KINDS_WITH_SOURCE.filter((k) => unavailableKinds.includes(k.kind));
  return (
    <fieldset className="space-y-1">
      <legend className="sr-only">Globos</legend>
      <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        <input type="checkbox" checked={on} onChange={(e) => onToggle(e.target.checked)} className="accent-brand-600" aria-label="Globos" />
        Globos
      </label>
      {on && (
        <ul className="space-y-1">
          {KINDS_WITH_SOURCE.map(({ kind, icon }) => {
            const count = balloons.filter((b) => b.kind === kind).length;
            return (
              <li key={kind} className={`flex items-center gap-2 text-xs ${count ? 'text-neutral-700' : 'text-neutral-400'}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/map/balloons/${icon}.svg`} alt="" className="h-5 w-5" />
                <span className="flex-1">{KIND_NAME[kind]}</span>
                <span className="tabular-nums">{count}</span>
              </li>
            );
          })}
        </ul>
      )}
      {on && missing.length > 0 && (
        <p role="status" className="text-xs text-alert-warning-fg">
          No se pudo consultar: {missing.map((k) => KIND_NAME[k.kind]).join(', ')}.
        </p>
      )}
    </fieldset>
  );
}
