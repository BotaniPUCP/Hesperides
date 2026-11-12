'use client';

import type { SpecimenExtraMeasure } from '@shared/types';
import { fechaCorta, unidadCorta } from './medidasEspecie';

/** El último valor de cada medida adicional, con su fecha: no todas se miden a la vez (SPEC-105 §5.4). */
export function SpecimenExtraMeasures({ medidas }: { medidas: SpecimenExtraMeasure[] }) {
  if (medidas.length === 0) return null;
  return (
    <dl className="mt-3 grid grid-cols-2 gap-2.5 text-sm">
      {medidas.map((m) => (
        <div key={m.code} className="p-3 rounded-2xl bg-neutral-50/70 border border-neutral-200/80">
          <dt className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">{m.label}</dt>
          <dd className="font-bold text-neutral-900 font-mono">{`${Number(m.value).toLocaleString('es-PE')} ${unidadCorta(m.unitCode)}`}</dd>
          <dd className="text-[11px] text-neutral-500">{fechaCorta(m.measuredAt)}</dd>
        </div>
      ))}
    </dl>
  );
}
