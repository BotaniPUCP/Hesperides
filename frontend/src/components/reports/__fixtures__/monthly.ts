import type { MonthlyReport, ReportOptions } from '@shared/types';

export const reportOptions: ReportOptions = {
  timeZone: 'America/Lima',
  defaults: { weekStart: '2026-11-02', monthly: { dateFrom: '2026-11-01', dateTo: '2026-11-30' }, directionMonth: '2026-10' },
  sectors: [
    { id: 1, code: 'SEC-VERDE-01', name: 'Sector verde 01' },
    { id: 4, code: 'SEC-POLIDEPORT', name: 'Sector Polideportivo' },
  ],
  teams: [{ id: 5, code: 'CUAD-01', name: 'Cuadrilla sector 01', sectorId: 1 }],
  classes: [
    { id: 12, code: 'PODA', label: 'Poda', types: [{ id: 30, code: 'PODA_MANTENIMIENTO', label: 'Poda de mantenimiento' }] },
    { id: 13, code: 'MANT_JARDINES', label: 'Mantenimiento de jardines', types: [{ id: 41, code: 'DESHIERBO', label: 'Deshierbo' }] },
  ],
};

const section = (sectionId: number, code: string, works: number, last: string | null) => ({
  sectionId, code, name: `Jardín ${code}`, sectorName: 'Sector verde 01', areaM2: 1000, approvedInterventions: works, lastAttendedOn: last,
});

export const monthlyReport: MonthlyReport = {
  period: { dateFrom: '2026-10-01', dateTo: '2026-10-31', timeZone: 'America/Lima' },
  scope: 'CAMPUS',
  coverage: {
    rule: 'PROVISIONAL_ONE_APPROVED_PER_SECTION', available: true, unavailableReason: null,
    coveredAreaM2: 1000, totalAreaM2: 4000, percent: 25, coveredSections: 1, totalSections: 2, sectionsWithoutArea: 0,
  },
  interventions: { approved: 3, pendingApproval: 1 },
  incidents: { pendingApproval: 2, open: 5, inProgress: 3, reportedInPeriod: 12, resolvedInPeriod: 9 },
  sectors: [{
    sectorId: 1, code: 'SEC-VERDE-01', name: 'Sector verde 01', coveredAreaM2: 1000, totalAreaM2: 4000, percent: 25,
    coveredSections: 1, totalSections: 2, approvedInterventions: 3,
  }],
  compliance: [
    {
      activityTypeItemId: 30, activityLabel: 'Poda de mantenimiento', regime: 'IN_HOUSE', evaluable: true, notEvaluableReason: null,
      onTarget: 2, early: 1, overdue: 1, notApplicable: 0,
      overdueTargets: [{ targetKind: 'ZONE', targetId: 50, label: 'Jardín Frutas', lastExecutionDate: '2026-08-30' }],
    },
    {
      activityTypeItemId: 31, activityLabel: 'Poda sanitaria', regime: 'OUTSOURCED', evaluable: false, notEvaluableReason: 'OUTSOURCED',
      onTarget: 0, early: 0, overdue: 0, notApplicable: 0, overdueTargets: [],
    },
  ],
  mostAttended: { total: 1, items: [section(50, 'AV-0151', 3, '2026-10-28')] },
  unattended: { total: 14, items: [section(77, 'AV-0302', 0, null)] },
  generatedAt: '2026-11-04T15:00:00Z',
};
