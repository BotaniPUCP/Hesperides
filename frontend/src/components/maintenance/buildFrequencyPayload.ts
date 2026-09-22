import type {
  CreateMaintenanceFrequencyRequest,
  FrequencyRuleTypeCode,
  MaintenanceRegime,
  MaintenanceScope,
  SeasonalInterval,
} from '@shared/types';
import type { RuleFieldsState } from './RuleTypeFields';
import { ANNUAL_WINDOWS, parseSeasonRows } from './seasons';

export interface FormState {
  activityTypeItemId: number;
  regime: MaintenanceRegime;
  ruleTypeCode: FrequencyRuleTypeCode;
  scope: MaintenanceScope;
  fields: RuleFieldsState;
  estimatedDuration: string;
  notes: string;
  isEditing: boolean;
}

export interface BuildResult {
  payload?: CreateMaintenanceFrequencyRequest;
  error?: string;
}

function num(value: string): number | null {
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? null : n;
}

/**
 * Traduce el formulario al payload de la API.
 *
 * Valida aquí lo mismo que el servidor rechaza, para que el usuario lo vea sin
 * esperar un 422. La validación del servidor sigue mandando: esto es una
 * cortesía de la interfaz, nunca la garantía.
 */
export function buildFrequencyPayload(s: FormState): BuildResult {
  if (!s.isEditing && !s.activityTypeItemId) {
    return { error: 'Selecciona el tipo de actividad' };
  }

  const f = s.fields;
  let seasons: SeasonalInterval[] = [];
  let min: number | null = null;
  let max: number | null = null;
  let target: number | null = null;
  let annual: number | null = null;
  let coverage: number | null = null;
  let windowStart: number | null = null;
  let windowEnd: number | null = null;

  switch (s.ruleTypeCode) {
    case 'INTERVAL_DAYS': {
      if (f.bySeasons) {
        const parsed = parseSeasonRows(f.seasonRows);
        if (parsed.error) return { error: parsed.error };
        seasons = parsed.seasons ?? [];
        break;
      }
      min = num(f.minDays);
      max = num(f.maxDays);
      target = num(f.targetDays);
      if (min === null || max === null) return { error: 'Indica los días mínimo y máximo' };
      if (min > max) return { error: 'El mínimo no puede superar al máximo' };
      break;
    }
    case 'SEASONAL_PERIOD': {
      annual = num(f.annualCount);
      if (annual === null || annual <= 0) return { error: 'Indica la cuota anual mínima' };
      break;
    }
    case 'ANNUAL_WINDOW': {
      annual = num(f.annualCount) ?? 1;
      const w = ANNUAL_WINDOWS.find((x) => x.value === f.windowPreset) ?? ANNUAL_WINDOWS[0];
      windowStart = w.startMonth;
      windowEnd = w.endMonth;
      break;
    }
    case 'COVERAGE_CYCLE': {
      coverage = num(f.coverageDays);
      if (coverage === null || coverage <= 0) return { error: 'Indica los días de cobertura' };
      break;
    }
    default:
      // ON_DEMAND no lleva parámetros: el backend rechaza una actividad reactiva
      // que a la vez declare periodicidad.
      break;
  }

  return {
    payload: {
      activityTypeItemId: s.activityTypeItemId,
      regime: s.regime,
      frequencyRuleTypeCode: s.ruleTypeCode,
      scope: s.scope,
      minDaysInterval: min,
      maxDaysInterval: max,
      targetDaysInterval: target,
      annualTargetCount: annual,
      coverageTargetDays: coverage,
      estimatedDurationDays: num(s.estimatedDuration),
      seasonStartMonth: windowStart,
      seasonEndMonth: windowEnd,
      seasons,
      notes: s.notes.trim() || null,
    },
  };
}
