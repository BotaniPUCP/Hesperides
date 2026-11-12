'use client';

import { useState } from 'react';
import type { PruningAssignment, SpecimenDetail } from '@shared/types';
import { Button } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { puedeEditarEjemplar } from '@/components/catastro/permisos';
import { fechaCorta } from './medidasEspecie';
import { SpecimenExtraMeasures } from './SpecimenExtraMeasures';
import { SpecimenMeasurementsModal } from './SpecimenMeasurementsModal';
import { SpecimenUnmeasuredBlock } from './SpecimenUnmeasuredBlock';

export interface SpecimenMeasuresProps {
  specimen: SpecimenDetail;
  showOperationalRegime?: boolean;
  onEditMeasures?: () => void;
}

interface DendrometricStat {
  label: string;
  num: string;
  unit: string;
  icon: React.ReactNode;
}

const PROPUESTAS: Record<PruningAssignment, string> = {
  STABLE_STAFF: 'Personal estable',
  THIRD_PARTY: 'Tercero',
  FIELD_VERIFICATION: 'Verificar la altura en campo',
};

export function SpecimenMeasures({
  specimen,
  showOperationalRegime = false,
  onEditMeasures,
}: SpecimenMeasuresProps) {
  const { user } = useAuth();
  const canEdit = puedeEditarEjemplar(user?.role.code);
  const [historyOpen, setHistoryOpen] = useState(false);
  const measured = specimen.measurementStatus === 'MEASURED';

  const formatMeasure = (val: number | null | undefined): string => {
    if (val == null || isNaN(Number(val))) return '—';
    return Number(val).toLocaleString('es-PE');
  };

  const stats: DendrometricStat[] = [
    {
      label: 'Altura total',
      num: formatMeasure(specimen.heightM),
      unit: specimen.heightM == null ? '' : 'm',
      icon: (
        <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      ),
    },
    {
      label: 'Altura fuste',
      num: formatMeasure(specimen.trunkHeightM),
      unit: specimen.trunkHeightM == null ? '' : 'm',
      icon: (
        <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
        </svg>
      ),
    },
    {
      label: 'DAP (tronco)',
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

  const noAplica: Record<string, boolean> = {
    'Altura fuste': !specimen.species.usesTrunkHeight && specimen.trunkHeightM == null,
    'DAP (tronco)': !specimen.species.usesDbh && specimen.dbhCm == null,
  };
  const visibles = stats.filter((s) => !noAplica[s.label]);

  return (
    <section aria-label="Medidas dendrométricas" className="flex flex-col h-full justify-between">
      <div>
        {/* Cabecera del bloque */}
        <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-neutral-100 text-neutral-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </span>
            <h3 className="text-xs sm:text-sm font-bold text-neutral-800 uppercase tracking-wider">
              Dimensiones Dendrométricas
            </h3>
          </div>

          {canEdit && onEditMeasures && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onEditMeasures}
              leadingIcon={
                <svg className="w-3.5 h-3.5 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              Nueva medición
            </Button>
          )}
        </div>

        {measured ? (
          <>
            {/* Cuadrícula balanceada de 2x2 para las 4 métricas dendrométricas */}
            <dl className="grid grid-cols-2 gap-2.5 text-sm">
              {visibles.map((s) => (
                <div
                  key={s.label}
                  className="p-3 rounded-2xl bg-neutral-50/70 border border-neutral-200/80 hover:border-neutral-300 transition-all flex flex-col justify-between min-h-[72px]"
                >
                  <div className="flex items-center gap-1.5 mb-1 text-neutral-500">
                    <span className="text-neutral-400 shrink-0">{s.icon}</span>
                    <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider truncate" title={s.label}>
                      {s.label}
                    </span>
                  </div>
                  <div>
                    <dd className="font-bold text-neutral-900 text-base font-mono tracking-tight leading-tight flex items-baseline gap-1">
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

            {specimen.measuredBeforeLastPruning && specimen.measuredAt && specimen.lastPruningDate && (
              <p className="mt-3 text-xs font-medium text-alert-warning-fg">
                Medido el {fechaCorta(specimen.measuredAt)}, antes de la poda del {fechaCorta(specimen.lastPruningDate)}
              </p>
            )}

          </>
        ) : (
          <SpecimenUnmeasuredBlock specimen={specimen} onMeasure={canEdit ? onEditMeasures : undefined} />
        )}

        <SpecimenExtraMeasures medidas={specimen.extraMeasures} />

        <div className={`mt-3.5 pt-3 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center ${showOperationalRegime ? 'sm:justify-between' : 'sm:justify-end'} gap-2 text-xs`}>
          {showOperationalRegime && (
            <p className="text-neutral-600">
              Atención propuesta: <strong className="font-semibold">{PROPUESTAS[specimen.pruningAssignment]}</strong>
            </p>
          )}
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800 hover:underline transition-colors py-0.5"
          >
            <span>Ver historial de medidas →</span>
          </button>
        </div>

      </div>

      <SpecimenMeasurementsModal
        code={specimen.code}
        speciesName={specimen.species.commonName || specimen.species.scientificName}
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />
    </section>
  );
}
