import type { MaintenanceFrequency } from '@shared/types';
import type { RuleFieldsState } from './RuleTypeFields';
import { ANNUAL_WINDOWS, toRow } from './seasons';

export const EMPTY_FIELDS: RuleFieldsState = {
  bySeasons: false,
  seasonRows: [],
  minDays: '',
  maxDays: '',
  annualCount: '',
  windowPreset: ANNUAL_WINDOWS[0].value,
  coverageDays: '',
};

export const optionalText = (value: number | null | undefined) => (value != null ? String(value) : '');

/** Los campos de una frecuencia existente, tal como los edita el formulario. */
export function fieldsFrom(f: MaintenanceFrequency): RuleFieldsState {
  const window = ANNUAL_WINDOWS.find((w) => w.startMonth === f.seasonStartMonth && w.endMonth === f.seasonEndMonth);
  return {
    // Las estaciones se leen tal cual: ya no hay que adivinarlas desde el
    // rango general, que era lo que perdía el detalle al editar.
    bySeasons: f.seasons.length > 0,
    seasonRows: f.seasons.map(toRow),
    minDays: optionalText(f.minDaysInterval),
    maxDays: optionalText(f.maxDaysInterval),
    annualCount: optionalText(f.annualTargetCount),
    windowPreset: window?.value ?? ANNUAL_WINDOWS[0].value,
    coverageDays: optionalText(f.coverageTargetDays),
  };
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
