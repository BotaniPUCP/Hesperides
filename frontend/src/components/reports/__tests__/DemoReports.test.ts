import { EMPTY_MONTHLY_FILTERS } from '@/lib/reportNavigation';
import { demoDirection, demoMonthly, demoWeekly } from '../demo/demoReports';

describe('datos de demostración', () => {
  it('la semanal se mueve a la semana y al sector elegidos', () => {
    const report = demoWeekly({ weekStart: '2026-09-07', sectorId: 3 });
    expect(report.week).toEqual(expect.objectContaining({ weekStart: '2026-09-07', weekEnd: '2026-09-13', inProgress: false }));
    expect(report.sector.name).toBe('Sector verde 03');
    expect(report.interventions.items.items[0].lastExecutionDate).toBe('2026-09-12');
  });

  it('la mensual con sector reduce las cifras a ese sector', () => {
    const report = demoMonthly({ ...EMPTY_MONTHLY_FILTERS, dateFrom: '2026-09-01', dateTo: '2026-09-30', sectorId: 4 });
    expect(report.period.dateFrom).toBe('2026-09-01');
    expect(report.sectors).toHaveLength(1);
    expect(report.coverage.percent).toBe(34.4);
  });

  it('el resumen termina su serie en el mes pedido', () => {
    const report = demoDirection('2026-03');
    expect(report.previousMonth).toBe('2026-02');
    expect(report.coverageSeries.points.map((p) => p.month))
      .toEqual(['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03']);
  });
});
