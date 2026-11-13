'use client';

import React from 'react';
import type { FrequencyRuleTypeCode } from '@shared/types';
import { SeasonalIntervalsEditor } from './SeasonalIntervalsEditor';
import { ANNUAL_WINDOWS, type SeasonRow, newRow } from './seasons';

const INPUT = 'w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-hidden';
const SELECT = `${INPUT} bg-neutral-0`;
/** Los días y cuotas son de dos o tres cifras: una caja angosta se lee mejor que una a todo el ancho. */
export const NUMBER = INPUT.replace('w-full', 'w-28');
const LABEL = 'mb-1 block text-sm font-medium text-neutral-700';

export interface RuleFieldsState {
  bySeasons: boolean;
  seasonRows: SeasonRow[];
  minDays: string;
  maxDays: string;
  annualCount: string;
  windowPreset: string;
  coverageDays: string;
}

interface Props {
  ruleTypeCode: FrequencyRuleTypeCode;
  state: RuleFieldsState;
  onChange: (patch: Partial<RuleFieldsState>) => void;
}

/**
 * Los campos que cada modelo de periodicidad necesita.
 *
 * Un formulario único con todos los campos visibles produciría datos
 * incoherentes: el backend rechaza, por ejemplo, una actividad a demanda que
 * además declare un intervalo.
 */
export function RuleTypeFields({ ruleTypeCode, state, onChange }: Props) {
  if (ruleTypeCode === 'INTERVAL_DAYS') {
    return (
      <fieldset className="rounded-md border border-neutral-200 p-3 space-y-3">
        <legend className="px-1 text-sm font-medium text-neutral-700">Intervalo entre ejecuciones</legend>

        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={!state.bySeasons}
              onChange={() => onChange({ bySeasons: false })}
            />
            Uniforme todo el año
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={state.bySeasons}
              onChange={() =>
                onChange({
                  bySeasons: true,
                  seasonRows: state.seasonRows.length === 0 ? [newRow([])] : state.seasonRows,
                })
              }
            />
            Varía por estación
          </label>
        </div>

        {state.bySeasons ? (
          <SeasonalIntervalsEditor
            rows={state.seasonRows}
            onChange={(seasonRows) => onChange({ seasonRows })}
          />
        ) : (
          <div className="flex flex-wrap gap-4">
            <label className="block">
              <span className={LABEL}>Mín. días</span>
              <input type="number" min={1} value={state.minDays}
                onChange={(e) => onChange({ minDays: e.target.value })}
                placeholder="30" className={NUMBER} />
            </label>
            <label className="block">
              <span className={LABEL}>Máx. días</span>
              <input type="number" min={1} value={state.maxDays}
                onChange={(e) => onChange({ maxDays: e.target.value })}
                placeholder="45" className={NUMBER} />
            </label>
          </div>
        )}
      </fieldset>
    );
  }

  if (ruleTypeCode === 'SEASONAL_PERIOD') {
    return (
      <label className="block">
        <span className={LABEL}>Cuota anual mínima</span>
        <input type="number" min={1} value={state.annualCount}
          onChange={(e) => onChange({ annualCount: e.target.value })}
          placeholder="4" className={NUMBER} />
        <span className="text-xs text-neutral-500 mt-1 block">
          Número mínimo de ejecuciones al año. En periodos más cortos se prorratea.
        </span>
      </label>
    );
  }

  if (ruleTypeCode === 'ANNUAL_WINDOW') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className={LABEL}>Cuota anual</span>
          <input type="number" min={1} value={state.annualCount}
            onChange={(e) => onChange({ annualCount: e.target.value })}
            placeholder="1" className={NUMBER} />
        </label>
        <label className="block">
          <span className={LABEL}>Ventana</span>
          <select value={state.windowPreset}
            onChange={(e) => onChange({ windowPreset: e.target.value })}
            className={SELECT}>
            {ANNUAL_WINDOWS.map((w) => (
              <option key={w.value} value={w.value}>{w.label}</option>
            ))}
          </select>
          <span className="text-xs text-neutral-500 mt-1 block">
            Una ejecución fuera de la ventana cuenta para la cuota, pero se marca.
          </span>
        </label>
      </div>
    );
  }

  if (ruleTypeCode === 'COVERAGE_CYCLE') {
    return (
      <label className="block">
        <span className={LABEL}>Días para cubrir el 100%</span>
        <input type="number" min={1} value={state.coverageDays}
          onChange={(e) => onChange({ coverageDays: e.target.value })}
          placeholder="15" className={NUMBER} />
      </label>
    );
  }

  return (
    <p className="rounded-md bg-neutral-50 p-3 text-xs text-neutral-600">
      Una actividad a demanda no lleva parámetros de periodicidad: es reactiva y nunca se reporta
      como vencida.
    </p>
  );
}
