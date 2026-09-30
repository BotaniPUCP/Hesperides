'use client';

import React from 'react';
import { Card } from '@/components/ui';

const FIELD = 'w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none';
const LABEL = 'block text-xs font-medium text-neutral-600 mb-1';

export interface FilterState {
  search: string;
  regime: string;
  ruleType: string;
}

interface Props {
  value: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  ruleTypes: { id: number; code: string; label: string }[];
}

/**
 * Los filtros del listado.
 *
 * El de modelo se puebla desde el catálogo en vez de una lista fija: añadir un
 * tipo de regla no debe exigir tocar este componente.
 */
export function FrequencyFilters({ value, onChange, ruleTypes }: Props) {
  return (
    <Card>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block">
          <span className={LABEL}>Buscar actividad</span>
          <input
            type="text"
            value={value.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Ej. Corte de césped, poda…"
            className={FIELD}
          />
        </label>

        <label className="block">
          <span className={LABEL}>Modalidad de ejecución</span>
          <select
            value={value.regime}
            onChange={(e) => onChange({ regime: e.target.value })}
            className={`${FIELD} bg-white`}
          >
            <option value="">Todas las modalidades</option>
            <option value="IN_HOUSE">Personal propio</option>
            <option value="OUTSOURCED">Tercerizado</option>
          </select>
        </label>

        <label className="block">
          <span className={LABEL}>Modelo de periodicidad</span>
          <select
            value={value.ruleType}
            onChange={(e) => onChange({ ruleType: e.target.value })}
            className={`${FIELD} bg-white`}
          >
            <option value="">Todos los modelos</option>
            {ruleTypes.map((r) => (
              <option key={r.id} value={r.code}>{r.label}</option>
            ))}
          </select>
        </label>
      </div>
    </Card>
  );
}
