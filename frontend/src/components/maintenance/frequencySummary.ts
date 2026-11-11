import type { MaintenanceFrequency } from '@shared/types';
import { SEASONS, monthName } from './seasons';

/** Lo que dice una frecuencia, en una frase, y el desglose cuando lo hay. */
export interface FrequencySummary {
  main: string;
  /** Solo cuando la frase no basta: el rango de cada estación. */
  detail?: string;
}

const days = (min: number | null, max: number | null) =>
  min === max ? `Cada ${min} días` : `Cada ${min} a ${max} días`;

const times = (n: number | null) => (n === 1 ? '1 vez' : `${n} veces`);

/**
 * «Cada cuánto» como se diría en voz alta. Una frase por regla, sin repetir el
 * tipo, que ya se muestra aparte.
 */
export function frequencySummary(f: MaintenanceFrequency): FrequencySummary {
  switch (f.frequencyRuleType.code) {
    case 'INTERVAL_DAYS':
      if (f.seasons.length === 0) return { main: days(f.minDaysInterval, f.maxDaysInterval) };
      return {
        main: 'Según la estación',
        detail: f.seasons
          .map((s) => `${SEASONS[s.season]?.label ?? s.season} ${s.minDaysInterval}–${s.maxDaysInterval} d`)
          .join(' · '),
      };
    case 'SEASONAL_PERIOD':
      return { main: `Mín. ${times(f.annualTargetCount)} al año` };
    case 'ANNUAL_WINDOW':
      return f.seasonStartMonth && f.seasonEndMonth
        ? { main: `${times(f.annualTargetCount)} entre ${monthName(f.seasonStartMonth)} y ${monthName(f.seasonEndMonth)}` }
        : { main: `${times(f.annualTargetCount)} al año` };
    case 'COVERAGE_CYCLE':
      return { main: `Todo cubierto cada ${f.coverageTargetDays} días` };
    case 'ON_DEMAND':
      return { main: 'Cuando se necesite' };
    default:
      return { main: '—' };
  }
}

export function scopeLabel(scope: MaintenanceFrequency['scope']): string {
  switch (scope) {
    case 'CAMPUS_WIDE':
      return 'Todo el campus';
    default:
      return 'Un conjunto';
  }
}
