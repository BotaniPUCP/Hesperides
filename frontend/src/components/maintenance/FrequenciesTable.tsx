'use client';

import React from 'react';
import type { GreenAreaSetSummary, MaintenanceFrequency } from '@shared/types';
import { Badge, Button } from '@/components/ui';
import { FrequencyParameters, scopeLabel } from './FrequencyParameters';
import { FrequencyRuleBadge } from './FrequencyRuleBadge';

interface Props {
  frequencies: MaintenanceFrequency[];
  sets: GreenAreaSetSummary[];
  canManage: boolean;
  onEdit: (f: MaintenanceFrequency) => void;
  onDeactivate: (id: number) => void;
}

export function FrequenciesTable({ frequencies, sets, canManage, onEdit, onDeactivate }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-neutral-200 text-left text-sm">
        <thead className="bg-neutral-50 text-neutral-600 font-medium">
          <tr>
            <th className="px-4 py-3">Actividad / Labor</th>
            <th className="px-4 py-3">Modalidad</th>
            <th className="px-4 py-3">Modelo</th>
            <th className="px-4 py-3">Parámetros</th>
            <th className="px-4 py-3">Duración</th>
            <th className="px-4 py-3">Se aplica a</th>
            <th className="px-4 py-3">Vigente desde</th>
            {canManage && <th className="px-4 py-3 text-right">Acciones</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {frequencies.map((f) => (
            <tr key={f.id} className="hover:bg-neutral-50 transition-colors">
              <td className="px-4 py-3 font-medium text-neutral-900">
                <div>{f.activityType.label}</div>
                {f.notes && (
                  <div
                    className="text-xs text-neutral-500 font-normal truncate max-w-xs"
                    title={f.notes}
                  >
                    {f.notes}
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                {f.regime === 'OUTSOURCED' ? (
                  <Badge label="Tercerizado" color="info" />
                ) : (
                  <Badge label="Personal propio" color="brand" />
                )}
              </td>
              <td className="px-4 py-3">
                <FrequencyRuleBadge
                  ruleCode={f.frequencyRuleType.code}
                  label={f.frequencyRuleType.label}
                />
              </td>
              <td className="px-4 py-3">
                <FrequencyParameters frequency={f} />
              </td>
              <td className="px-4 py-3 text-neutral-700">
                {f.estimatedDurationDays ? `${f.estimatedDurationDays} días` : '—'}
              </td>
              <td className="px-4 py-3 text-xs text-neutral-600">
                {f.scope === 'BY_SET' && f.greenAreaSetId != null ? (
                  <>
                    <span className="block font-medium text-neutral-800">
                      {sets.find((s) => s.id === f.greenAreaSetId)?.name ?? `Conjunto ${f.greenAreaSetId}`}
                    </span>
                    {/* SPEC-203 §5.3: el único lugar donde se dice que el cada cuánto no es el general. */}
                    <span className="block">propio de este conjunto</span>
                  </>
                ) : scopeLabel(f.scope)}
              </td>
              {/* Delata desde cuándo rige esta versión: sin eso, el historial
                  existiría en la base pero no se vería en la pantalla. */}
              <td className="px-4 py-3 text-xs text-neutral-600">{f.validFrom}</td>
              {canManage && (
                <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                  <Button variant="secondary" size="sm" onClick={() => onEdit(f)}>
                    Editar
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => onDeactivate(f.id)}>
                    Desactivar
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
