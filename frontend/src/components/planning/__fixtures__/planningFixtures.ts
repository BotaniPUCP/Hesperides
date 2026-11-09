import type { PlanningRow } from '@shared/types';

/** Una fila de planificación de ejemplo; cada prueba cambia solo lo que mide. */
export function planningRow(over: Partial<PlanningRow> = {}): PlanningRow {
  return {
    setId: 3,
    setName: 'Ingreso Riva-Agüero',
    zoneCount: 18,
    activityTypeItemId: 30,
    activityLabel: 'Corte de césped',
    ruleKind: 'INTERVAL_DAYS',
    ownRule: false,
    rhythm: { minDays: 30, maxDays: 35, seasonLabel: 'Primavera', annualTarget: null, windowStartMonth: null, windowEndMonth: null },
    state: 'OVERDUE',
    days: 4,
    lastDate: '2026-09-30',
    daysSinceLast: 39,
    progress: null,
    neverAttendedCount: 0,
    openIntervention: null,
    estimatedDate: null,
    yearCount: null,
    suggestedDate: '2026-11-08',
    ...over,
  };
}
