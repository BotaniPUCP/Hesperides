'use client';

import { useState } from 'react';
import { Badge, type BadgeColor } from '@/components/ui';

export interface SpecimenIntervention {
  id: string | number;
  date: string;
  className: string;
  typeName: string;
  supervisorName: string;
  executedQuantity?: number | null;
  unit?: string | null;
  notes?: string | null;
  status?: string | null;
}

export interface SpecimenInterventionsProps {
  code: string;
  interventions?: SpecimenIntervention[];
}

const fecha = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

function getInterventionBadgeColor(className: string): BadgeColor {
  const norm = className.toUpperCase();
  if (norm.includes('PODA')) return 'warning';
  if (norm.includes('RIEGO')) return 'info';
  if (norm.includes('FITOSANITARIO') || norm.includes('FERTILIZ') || norm.includes('SUELO')) return 'brand';
  return 'neutral';
}

/**
 * Historial de intervenciones por ejemplar (C-05 · REQ 2.7).
 * Diseñado por contrato para mostrar las labores ejecutadas en campo
 * una vez conectado al registro diario de actividades (Épica B).
 */
export function SpecimenInterventions({
  code: _code,
  interventions: initialInterventions = [],
}: SpecimenInterventionsProps) {
  const [interventions] = useState<SpecimenIntervention[]>(initialInterventions);

  return (
    <div className="rounded-3xl border border-neutral-200/90 bg-neutral-0 p-6 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-neutral-100 gap-2">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 rounded-lg bg-neutral-100 text-neutral-600">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
              />
            </svg>
          </span>
          <div>
            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
              Historial de Intervenciones
            </h2>
            <p className="text-xs text-neutral-500">
              Labores de poda, riego y mantenimiento registradas para este ejemplar
            </p>
          </div>
        </div>

        {interventions.length > 0 && (
          <div className="self-start sm:self-center">
            <Badge
              label={`${interventions.length} ${interventions.length === 1 ? 'registro' : 'registros'}`}
              color="neutral"
            />
          </div>
        )}
      </div>

      {interventions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200/90 bg-neutral-50/50 p-5 text-center flex flex-col items-center justify-center">
          <p className="text-xs text-neutral-500">
            No se registran labores de poda, riego o mantenimiento para este ejemplar.
          </p>
        </div>
      ) : (
        <ol aria-label="Historial de intervenciones" className="space-y-3">
          {interventions.map((item) => {
            return (
              <li
                key={item.id}
                className="rounded-2xl border border-neutral-200/80 bg-neutral-50/70 p-4 text-sm transition-all hover:border-neutral-300"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-neutral-900 font-mono text-sm">
                      {fecha(item.date)}
                    </span>
                    <Badge
                      label={item.className}
                      color={getInterventionBadgeColor(item.className)}
                    />
                  </div>
                  {item.status && (
                    <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">
                      {item.status}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="font-medium text-neutral-900 text-sm">{item.typeName}</p>
                  {item.notes && (
                    <p className="text-xs text-neutral-600 leading-relaxed">{item.notes}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-3 pt-2.5 border-t border-neutral-200/60 text-xs text-neutral-500">
                  <span className="flex items-center gap-1">
                    <span>👷 Resp.:</span>
                    <strong className="text-neutral-700 font-medium">{item.supervisorName}</strong>
                  </span>
                  {item.executedQuantity && (
                    <span className="flex items-center gap-1">
                      <span>Cantidad:</span>
                      <strong className="text-neutral-700 font-medium">
                        {item.executedQuantity} {item.unit ?? ''}
                      </strong>
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
