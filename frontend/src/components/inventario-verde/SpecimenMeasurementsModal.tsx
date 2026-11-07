'use client';

import { useCallback } from 'react';
import type { MeasurementRecord } from '@shared/types';
import { Button, Modal } from '@/components/ui';
import { useRequest } from '@/hooks/useRequest';
import { catastroApi } from '@/lib/catastro-api';

export interface SpecimenMeasurementsModalProps {
  code: string;
  speciesName: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdateRequested?: () => void;
}

const fecha = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('es-PE', { dateStyle: 'medium' });

export function SpecimenMeasurementsModal({
  code,
  speciesName,
  isOpen,
  onClose,
  onUpdateRequested,
}: SpecimenMeasurementsModalProps) {
  const fetchMeasurements = useCallback(() => catastroApi.measurements(code), [code]);
  const { data: history, loading, errorMessage: error } = useRequest<MeasurementRecord[]>(
    isOpen ? `measurements-${code}` : null,
    fetchMeasurements,
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Historial de Mediciones · ${code}`}
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {onUpdateRequested && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onUpdateRequested();
                }}
              >
                + Nueva medición
              </Button>
            )}
          </div>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Cabecera contextual usando tokens temáticos de Hespérides */}
        <div className="rounded-xl bg-neutral-50 p-3 border border-neutral-200 flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-neutral-900">{speciesName}</span>
            <span className="text-neutral-500 ml-1.5 font-mono">({code})</span>
          </div>
          <span className="text-neutral-500">
            {history ? `${history.length} ${history.length === 1 ? 'medición' : 'mediciones'}` : 'Consultando...'}
          </span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-neutral-500">
            Cargando historial de mediciones...
          </div>
        ) : error ? (
          <div className="p-3 rounded-xl bg-action-danger/10 border border-action-danger/20 text-action-danger text-xs font-medium">
            {error}
          </div>
        ) : history && history.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 p-6 text-center text-xs text-neutral-500">
            No se han registrado mediciones históricas para este ejemplar.
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-200 bg-neutral-0">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-200">
                <tr>
                  <th className="py-2.5 px-3 font-bold rounded-tl-2xl">Fecha</th>
                  <th className="py-2.5 px-3 font-bold">Altura (m)</th>
                  <th className="py-2.5 px-3 font-bold">Fuste (m)</th>
                  <th className="py-2.5 px-3 font-bold">DAP (cm)</th>
                  <th className="py-2.5 px-3 font-bold">Radio Copa (m)</th>
                  <th className="py-2.5 px-3 font-bold rounded-tr-2xl">Zunchado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {history?.map((m, index) => {
                  const isLatest = index === 0;
                  return (
                    <tr
                      key={m.id}
                      className={isLatest ? 'bg-brand-50/70 font-medium' : 'hover:bg-neutral-50/60 transition-colors'}
                    >
                      <td className="py-2.5 px-3 text-neutral-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{fecha(m.date)}</span>
                          {isLatest && (
                            <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-bold bg-brand-100 text-brand-800">
                              Vigente
                            </span>
                          )}
                          {m.notes && (
                            <div className="relative group/tooltip inline-flex items-center">
                              <button
                                type="button"
                                className="inline-flex items-center justify-center p-1 rounded-md text-amber-700 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 transition-colors cursor-help"
                                aria-label="Ver nota de la medición"
                                aria-describedby={`tooltip-calc-${m.id}`}
                              >
                                <svg
                                  className="w-3.5 h-3.5 shrink-0"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                  />
                                </svg>
                              </button>

                              {/* Tooltip flotante en hover con z-50 y sin clipping */}
                              <div
                                id={`tooltip-calc-${m.id}`}
                                role="tooltip"
                                className="pointer-events-none absolute left-0 bottom-full mb-2 hidden group-hover/tooltip:block group-focus-within/tooltip:block z-50 w-72 sm:w-80 rounded-xl bg-neutral-900 text-white p-3 text-xs shadow-2xl border border-neutral-700/80 backdrop-blur-xs animate-in fade-in-0 zoom-in-95 duration-150"
                              >
                                <div className="flex items-center gap-1.5 mb-1 text-amber-400 font-bold text-[11px] uppercase tracking-wider">
                                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span>Nota de la medición</span>
                                </div>
                                <p className="text-neutral-200 text-[11px] leading-relaxed font-sans whitespace-normal font-normal">
                                  {m.notes}
                                </p>
                                {/* Triángulo indicador inferior */}
                                <div className="absolute top-full left-3 -mt-px border-4 border-transparent border-t-neutral-900" />
                              </div>
                            </div>
                          )}
                        </div>
                        {m.measuredBy && (
                          <div className="text-[10px] text-neutral-500 mt-0.5">
                            Por: {m.measuredBy}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-neutral-900">
                        {m.heightM != null ? `${m.heightM} m` : '—'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-neutral-700">
                        {m.trunkHeightM != null ? `${m.trunkHeightM} m` : '—'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-neutral-700">
                        {m.dbhCm != null ? `${m.dbhCm} cm` : '—'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-neutral-700">
                        {m.crownRadiusM != null ? `${m.crownRadiusM} m` : '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        {m.banded === true ? (
                          <span className="inline-flex items-center text-amber-700 font-medium">
                            Con zuncho
                          </span>
                        ) : m.banded === false ? (
                          <span className="text-neutral-500">Sin zuncho</span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}
