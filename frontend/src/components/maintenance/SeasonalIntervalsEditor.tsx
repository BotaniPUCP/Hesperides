'use client';

import React from 'react';
import type { SeasonKey } from '@shared/types';
import { Button } from '@/components/ui';
import { SEASONS, SEASON_ORDER, type SeasonRow, newRow } from './seasons';

interface Props {
  rows: SeasonRow[];
  onChange: (rows: SeasonRow[]) => void;
}

/**
 * Los intervalos por estación.
 *
 * Cada fila viaja al backend como datos y no como el resumen de texto que este
 * formulario componía antes: por eso el motor puede decidir que 43 días cumplen
 * en invierno y no en verano.
 */
export function SeasonalIntervalsEditor({ rows, onChange }: Props) {
  const usadas = rows.map((r) => r.season);
  const puedeAgregar = rows.length < SEASON_ORDER.length;

  const update = (id: string, field: keyof SeasonRow, value: string) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.id} className="rounded-md border border-neutral-200 bg-white p-3">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1">
              <select
                value={row.season}
                onChange={(e) => update(row.id, 'season', e.target.value as SeasonKey)}
                className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm font-medium focus:border-primary-500 focus:outline-none"
              >
                {SEASON_ORDER.map((key) => (
                  <option
                    key={key}
                    value={key}
                    disabled={key !== row.season && usadas.includes(key)}
                  >
                    {SEASONS[key].label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-neutral-500 mt-1">{SEASONS[row.season].desc}</p>
            </div>
            <button
              type="button"
              onClick={() => onChange(rows.filter((r) => r.id !== row.id))}
              className="text-xs font-medium text-rose-600 hover:underline"
            >
              Quitar
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <label className="block">
              <span className="block text-xs font-medium text-neutral-600 mb-1">Mín. días</span>
              <input
                type="number"
                min={1}
                value={row.minDays}
                onChange={(e) => update(row.id, 'minDays', e.target.value)}
                placeholder="30"
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-neutral-600 mb-1">Máx. días</span>
              <input
                type="number"
                min={1}
                value={row.maxDays}
                onChange={(e) => update(row.id, 'maxDays', e.target.value)}
                placeholder="35"
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-neutral-600 mb-1">
                Teórico
                <span className="font-normal text-neutral-400"> (opc.)</span>
              </span>
              <input
                type="number"
                min={1}
                value={row.targetDays}
                onChange={(e) => update(row.id, 'targetDays', e.target.value)}
                placeholder="21"
                className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
              />
            </label>
          </div>
        </div>
      ))}

      {puedeAgregar && (
        <Button type="button" variant="secondary" size="sm" onClick={() => onChange([...rows, newRow(usadas)])}>
          + Agregar estación
        </Button>
      )}

      <p className="text-xs text-neutral-500">
        El intervalo <strong>teórico</strong> es el del manual; el mínimo y el máximo son el rango
        operativo real. Guardar ambos permite ver la brecha entre la norma y lo que el clima impone.
      </p>
    </div>
  );
}
