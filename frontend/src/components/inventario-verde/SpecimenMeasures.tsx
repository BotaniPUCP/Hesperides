'use client';

import type { SpecimenDetail } from '@shared/types';

/**
 * Medidas dendrométricas del ejemplar con su procedencia (C-08).
 * La altura decide quién poda: si nadie la midió en campo, se muestra
 * «sin medir» y se exige verificación, nunca se asume una medida por especie.
 */


interface DendrometricStat {
  label: string;
  num: string;
  unit: string;
  icon: React.ReactNode;
}

export function SpecimenMeasures({
  specimen,
}: {
  specimen: SpecimenDetail;
  showOperationalRegime?: boolean;
}) {
  const measured = specimen.dataSource !== 'UNKNOWN';

  const formatMeasure = (val: number | null | undefined): string => {
    if (val == null || isNaN(Number(val))) return '—';
    return Number(val).toLocaleString('es-PE');
  };

  const stats: DendrometricStat[] = [
    {
      label: 'Altura',
      num: formatMeasure(specimen.heightM),
      unit: specimen.heightM == null ? '' : 'm',
      icon: (
        <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      ),
    },
    {
      label: 'Altura del fuste',
      num: formatMeasure(specimen.trunkHeightM),
      unit: specimen.trunkHeightM == null ? '' : 'm',
      icon: (
        <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
        </svg>
      ),
    },
    {
      label: 'DAP',
      num: formatMeasure(specimen.dbhCm),
      unit: specimen.dbhCm == null ? '' : 'cm',
      icon: (
        <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <circle cx="12" cy="12" r="8" strokeWidth={2} strokeDasharray="3 3" />
        </svg>
      ),
    },
    {
      label: 'Radio de copa',
      num: formatMeasure(specimen.crownRadiusM),
      unit: specimen.crownRadiusM == null ? '' : 'm',
      icon: (
        <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
  ];

  return (
    <section aria-label="Medidas" className="flex flex-col h-full">
      {/* Cabecera del bloque idéntica a Territorio y Datos Registrales */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-neutral-100">
        <span className="p-1 rounded-md bg-neutral-100 text-neutral-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </span>
        <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
          Dimensiones Dendrométricas
        </h3>
      </div>

      {measured ? (
        /* Cuadrícula balanceada de 2x2 para las 4 métricas dendrométricas */
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {stats.map((s) => (
            <div
              key={s.label}
              className="p-3.5 rounded-2xl bg-neutral-50/70 border border-neutral-200/80 hover:border-neutral-300 transition-all flex flex-col justify-between min-h-[76px]"
            >
              <div className="flex items-center gap-1.5 mb-1.5 text-neutral-500">
                <span className="text-neutral-400 shrink-0">{s.icon}</span>
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">{s.label}</span>
              </div>
              <div>
                <dd className="font-extrabold text-neutral-900 text-lg font-mono tracking-tight leading-tight flex items-baseline gap-1">
                  <span>{s.num}</span>
                  {s.unit && (
                    <span className="text-xs font-semibold text-neutral-500 font-sans">
                      {s.unit}
                    </span>
                  )}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      ) : (
        <div className="p-3.5 rounded-xl bg-alert-warning-bg border border-alert-warning-border flex items-start gap-3">
          <div className="p-1 rounded-md bg-alert-warning-bg border border-alert-warning-border text-alert-warning-fg shrink-0 mt-0.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold text-alert-warning-fg uppercase tracking-wider mb-0.5">
              Medición Pendiente en Campo
            </p>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Nadie ha medido este ejemplar todavía. Su altura debe verificarse en campo antes de decidir quién lo poda.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
