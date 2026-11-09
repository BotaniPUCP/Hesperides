/**
 * Contracts of the reports module (SPEC-202 §3). Dates travel as YYYY-MM-DD,
 * instants as ISO 8601 UTC, areas in m² with two decimals and percents with one.
 * Codes are computed values sent by the backend; the UI translates them.
 */

export interface ReportOption { id: number; code: string; label: string }

export interface ReportSectorOption { id: number; code: string; name: string }

export interface ReportTeamOption { id: number; code: string; name: string; sectorId: number | null }

export interface ReportClassOption extends ReportOption { types: ReportOption[] }

export interface ReportOptions {
  timeZone: string;
  defaults: {
    weekStart: string;
    monthly: { dateFrom: string; dateTo: string };
    directionMonth: string;
  };
  sectors: ReportSectorOption[];
  teams: ReportTeamOption[];
  classes: ReportClassOption[];
}

export interface ReportSection { id: number; code: string; name: string; areaM2: number | null }

/** A capped list with its exact total (D-11). */
export interface ReportTopList<T> { total: number; items: T[] }

export type CoverageUnavailableReason = 'NO_SECTOR_ASSIGNED';
export type NotEvaluableReason = 'OUTSOURCED';

export interface MonthlyCoverage {
  rule: string;
  available: boolean;
  unavailableReason: CoverageUnavailableReason | null;
  coveredAreaM2: number;
  totalAreaM2: number;
  percent: number | null;
  coveredSections: number;
  totalSections: number;
  sectionsWithoutArea: number;
}

export interface MonthlySectorRow {
  sectorId: number | null;
  code: string | null;
  name: string;
  coveredAreaM2: number;
  totalAreaM2: number;
  percent: number | null;
  coveredSections: number;
  totalSections: number;
  approvedInterventions: number;
}

export interface OverdueTarget { targetKind: string; targetId: number; label: string; lastExecutionDate: string | null }

export interface ActivityCompliance {
  activityTypeItemId: number;
  activityLabel: string;
  regime: string;
  evaluable: boolean;
  notEvaluableReason: NotEvaluableReason | null;
  onTarget: number;
  early: number;
  overdue: number;
  notApplicable: number;
  overdueTargets: OverdueTarget[];
}

export interface MonthlySectionRow {
  sectionId: number;
  code: string;
  name: string;
  sectorName: string;
  areaM2: number | null;
  approvedInterventions: number;
  lastAttendedOn: string | null;
}

export interface MonthlyReport {
  period: { dateFrom: string; dateTo: string; timeZone: string };
  scope: 'CAMPUS' | 'TEAMS';
  coverage: MonthlyCoverage;
  interventions: { approved: number; pendingApproval: number };
  incidents: { pendingApproval: number; open: number; inProgress: number; reportedInPeriod: number; resolvedInPeriod: number };
  sectors: MonthlySectorRow[];
  compliance: ActivityCompliance[];
  mostAttended: ReportTopList<MonthlySectionRow>;
  unattended: ReportTopList<MonthlySectionRow>;
  generatedAt: string;
}
