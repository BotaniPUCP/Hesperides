import type { MaintenanceFrequency } from '@shared/types';
import { frequencySummary } from '../frequencySummary';

const base = {
  minDaysInterval: null, maxDaysInterval: null, annualTargetCount: null, coverageTargetDays: null,
  seasonStartMonth: null, seasonEndMonth: null, seasons: [],
} as unknown as MaintenanceFrequency;

const rule = (code: string, extra: Partial<MaintenanceFrequency> = {}) =>
  ({ ...base, ...extra, frequencyRuleType: { id: 1, code, label: code } }) as MaintenanceFrequency;

describe('frequencySummary', () => {
  it('dice cada cuánto en una frase, sin repetir el tipo', () => {
    expect(frequencySummary(rule('INTERVAL_DAYS', { minDaysInterval: 1, maxDaysInterval: 10 })).main).toBe('Cada 1 a 10 días');
    expect(frequencySummary(rule('INTERVAL_DAYS', { minDaysInterval: 7, maxDaysInterval: 7 })).main).toBe('Cada 7 días');
    expect(frequencySummary(rule('SEASONAL_PERIOD', { annualTargetCount: 1 })).main).toBe('Mín. 1 vez al año');
    expect(frequencySummary(rule('ANNUAL_WINDOW', { annualTargetCount: 1, seasonStartMonth: 12, seasonEndMonth: 1 })).main)
      .toBe('1 vez entre dic y ene');
    expect(frequencySummary(rule('COVERAGE_CYCLE', { coverageTargetDays: 15 })).main).toBe('Todo cubierto cada 15 días');
    expect(frequencySummary(rule('ON_DEMAND')).main).toBe('Cuando se necesite');
  });

  it('con estaciones, el desglose va aparte de la frase', () => {
    const s = frequencySummary(rule('INTERVAL_DAYS', { seasons: [
      { season: 'VERANO', startMonth: 1, endMonth: 3, minDaysInterval: 30, maxDaysInterval: 35 },
      { season: 'INVIERNO', startMonth: 7, endMonth: 9, minDaysInterval: 40, maxDaysInterval: 45 },
    ] }));
    expect(s).toEqual({ main: 'Según la estación', detail: 'Verano 30–35 d · Invierno 40–45 d' });
  });
});
