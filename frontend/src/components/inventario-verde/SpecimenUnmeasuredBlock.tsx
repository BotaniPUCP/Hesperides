'use client';

import type { SpecimenDetail } from '@shared/types';
import { Button } from '@/components/ui';

export interface SpecimenUnmeasuredBlockProps {
  specimen: SpecimenDetail;
  /** Abre el registro de la medición; ausente si quien mira no puede registrarla. */
  onMeasure?: () => void;
}

const metros = (valor: number | null) => (valor === null ? '—' : `${Number(valor).toLocaleString('es-PE')} m`);

/**
 * Un ejemplar sin medida real (SPEC-105 §5.4). Nunca muestra un promedio como si
 * fuera una medida: el texto lo dice, y los valores van atenuados.
 */
export function SpecimenUnmeasuredBlock({ specimen, onMeasure }: SpecimenUnmeasuredBlockProps) {
  const accion = onMeasure && (
    <Button variant="secondary" size="sm" onClick={onMeasure}>Registrar medición</Button>
  );

  if (specimen.measurementStatus === 'REFERENCE') {
    return (
      <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Promedio de la especie · No medido</p>
          {accion}
        </div>
        <dl className="grid grid-cols-2 gap-2.5 text-sm text-neutral-600">
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Altura</dt>
            <dd className="font-mono text-base">{metros(specimen.referenceHeightM)}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Radio de copa</dt>
            <dd className="font-mono text-base">{metros(specimen.referenceCrownRadiusM)}</dd>
          </div>
        </dl>
        <ul className="text-[11px] text-neutral-500">
          <li>Altura: {specimen.referenceHeightSourceName}</li>
          <li>Radio de copa: {specimen.referenceCrownRadiusSourceName}</li>
        </ul>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div>
        <p className="text-xs font-bold text-amber-950 uppercase tracking-wider">Medición Pendiente en Campo</p>
        <p className="text-xs text-neutral-600 leading-relaxed mt-0.5">
          Nadie ha medido este ejemplar todavía. Su altura real debe verificarse en campo.
        </p>
      </div>
      {accion}
    </div>
  );
}
