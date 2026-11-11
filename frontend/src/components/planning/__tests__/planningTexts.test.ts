import { historyLine, rhythmText, rowTitle, stateDetail, stateLabel } from '../planningTexts';
import { planningRow } from '../__fixtures__/planningFixtures';

const window = { minDays: null, maxDays: null, seasonLabel: null, annualTarget: 1, windowStartMonth: 12, windowEndMonth: 1 };
const quota = { minDays: null, maxDays: null, seasonLabel: null, annualTarget: 4, windowStartMonth: null, windowEndMonth: null };

describe('planningTexts (SPEC-203 §7)', () => {
  it.each([
    [planningRow({ state: 'OVERDUE', days: 4 }), 'Toca, atrasada', '(4 días tarde)'],
    [planningRow({ state: 'OVERDUE', days: 1 }), 'Toca, atrasada', '(1 día tarde)'],
    [planningRow({ state: 'DUE', days: 0 }), 'Toca', '(vence hoy)'],
    [planningRow({ state: 'DUE', days: 4 }), 'Toca', '(quedan 4 días de plazo)'],
    [planningRow({ state: 'DUE', days: null, neverAttendedCount: 3 }), 'Toca', '3 jardines sin registro previo'],
    [planningRow({ state: 'NOT_DUE', days: 19 }), 'Aún no toca', '(faltan 19 días)'],
    [planningRow({ state: 'NOT_DUE', days: 23, ruleKind: 'ANNUAL_WINDOW', rhythm: window }), 'Aún no toca', '(la ventana abre en 23 días)'],
    [planningRow({ state: 'OVERDUE', days: 2, ruleKind: 'ANNUAL_WINDOW', rhythm: window }), 'Toca, atrasada', '(la ventana cerró hace 2 días)'],
    [planningRow({ state: 'IN_PROGRESS', days: 16, progress: { done: 34, total: 50 } }), 'En curso', '(faltan 16 jardines)'],
    [planningRow({ state: 'SCHEDULED', days: null, openIntervention: { id: 81, code: 'INT-000081', scheduledDate: '2026-11-12', startedDate: null } }),
      'Programada', '(para el 12 nov)'],
    [planningRow({ state: 'DUE', days: 6, ruleKind: 'SEASONAL_PERIOD', rhythm: quota, estimatedDate: '2026-11-14', yearCount: 3 }),
      'Toca', '(próxima estimada: 14 nov)'],
    [planningRow({ state: 'DONE_FOR_PERIOD', days: null, ruleKind: 'SEASONAL_PERIOD', rhythm: quota, yearCount: 4 }), 'Cumplido', '(4 de 4 en el año)'],
    [planningRow({ state: 'NOT_CONFIGURED', days: null, rhythm: null, ruleKind: null }), 'Sin frecuencia configurada', ''],
  ])('%#: %s', (row, label, detail) => {
    expect(stateLabel(row)).toBe(label);
    expect(stateDetail(row)).toBe(detail);
  });

  it('dice cada cuánto sin la palabra «ritmo»', () => {
    expect(rhythmText(planningRow())).toBe('Cada 30–35 días en primavera');
    expect(rhythmText(planningRow({ ruleKind: 'COVERAGE_CYCLE', rhythm: { ...quota, annualTarget: null, minDays: 15, maxDays: 15 } })))
      .toBe('Cada 15 días');
    expect(rhythmText(planningRow({ ruleKind: 'SEASONAL_PERIOD', rhythm: quota, yearCount: 3 }))).toBe('4 al año · van 3');
    expect(rhythmText(planningRow({ ruleKind: 'ANNUAL_WINDOW', rhythm: window }))).toBe('1 al año, entre diciembre y enero');
  });

  it('la historia es la última vez, o el avance «X de N» si está en curso', () => {
    expect(historyLine(planningRow())).toEqual({ label: 'Última vez', value: '30 sep (hace 39 días)' });
    expect(historyLine(planningRow({ state: 'IN_PROGRESS', progress: { done: 34, total: 50 },
      openIntervention: { id: 81, code: 'INT-000081', scheduledDate: '2026-11-04', startedDate: '2026-11-05' } }), new Date('2026-11-08T12:00:00')))
      .toEqual({ label: 'Avance', value: '34 de 50 jardines · empezó el 5 nov (hace 3 días)' });
    expect(historyLine(planningRow({ lastDate: null, daysSinceLast: null, neverAttendedCount: 18 })))
      .toEqual({ label: 'Última vez', value: 'Sin registro previo' });
  });

  it('con ejemplares, el avance y los «sin registro» cuentan jardines y ejemplares', () => {
    expect(historyLine(planningRow({ state: 'IN_PROGRESS', zoneCount: 0, elementCount: 5, progress: { done: 1, total: 5 },
      openIntervention: { id: 81, code: 'INT-000081', scheduledDate: '2026-11-04', startedDate: '2026-11-08' } }), new Date('2026-11-08T12:00:00')).value)
      .toBe('1 de 5 ejemplares · empezó el 8 nov (hoy)');
    expect(stateDetail(planningRow({ state: 'DUE', days: null, neverAttendedCount: 2, elementCount: 4 })))
      .toBe('2 jardines o ejemplares sin registro previo');
    expect(stateDetail(planningRow({ state: 'IN_PROGRESS', days: 3, zoneCount: 0, elementCount: 9 }))).toBe('(faltan 3 ejemplares)');
  });

  it('con uno solo, el verbo va en singular', () => {
    expect(stateDetail(planningRow({ state: 'NOT_DUE', days: 1 }))).toBe('(falta 1 día)');
    expect(stateDetail(planningRow({ state: 'IN_PROGRESS', days: 1 }))).toBe('(falta 1 jardín)');
  });

  it('el título es la actividad en el conjunto', () => {
    expect(rowTitle(planningRow())).toBe('Corte de césped en Ingreso Riva-Agüero');
  });
});
