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
export type NotEvaluableReason = 'OUTSOURCED' | 'BY_SECTOR';

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
  withinTolerance: number;
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

/* ---------- Weekly report of the sector (SPEC-202 §3.3) ---------- */

export interface ReportCodeLabel { code: string; label: string }

export interface WeeklyPlaceRef { kind: 'ZONE' | 'PLACE'; id: number; label: string }

export interface WeeklyWorkRow {
  id: number;
  code: string;
  classLabel: string;
  typeLabel: string | null;
  lastExecutionDate: string;
  approvedOn: string | null;
  places: WeeklyPlaceRef[];
}

export interface WeeklyTypeRow { classLabel: string; typeItemId: number | null; typeLabel: string; approved: number; places: string[] }

export interface WeeklyNotIrrigated { sectionId: number; code: string; name: string; lastIrrigatedOn: string | null }

export interface WeeklyIncidentRow {
  id: number;
  description: string;
  locationReference: string | null;
  urgency: ReportCodeLabel | null;
  status: ReportCodeLabel;
  teamName: string | null;
  reportedOn: string;
  daysOpen: number;
  locatedBy: 'COORDINATES' | 'TEAM';
}

export interface WeeklyReport {
  week: { weekStart: string; weekEnd: string; timeZone: string; inProgress: boolean; cutoffDate: string };
  scope: 'SECTOR' | 'TEAMS';
  sector: { id: number; code: string; name: string; totalSections: number; totalAreaM2: number };
  teams: { id: number; name: string; supervisorName: string | null }[];
  interventions: {
    approved: number;
    approvedPreviousWeek: number;
    pendingApproval: number;
    pendingPhotos: number;
    byType: WeeklyTypeRow[];
    items: ReportTopList<WeeklyWorkRow>;
  };
  attendedSections: { rule: string; covered: number; total: number; percent: number | null };
  irrigation: {
    rule: string;
    turns: number;
    irrigatedSections: number;
    totalSections: number;
    percent: number | null;
    notIrrigated: ReportTopList<WeeklyNotIrrigated>;
  };
  incidents: {
    asOf: string;
    open: number;
    pendingApproval: number;
    unlocatedInScope: number | null;
    items: ReportTopList<WeeklyIncidentRow>;
  };
  generatedAt: string;
}

/* ---------- Summary for the direction (SPEC-202 §3.5) ---------- */

export type DirectionIndicatorCode =
  | 'COVERAGE' | 'IRRIGATION_COVERAGE' | 'APPROVED_INTERVENTIONS' | 'RESOLVED_INCIDENTS' | 'TREE_INVENTORY'
  | 'IRRIGATION_CYCLES' | 'PHYTOSANITARY_CONTROLS' | 'MAJOR_PRUNING' | 'HIGH_URGENCY_ON_TIME';

export type IndicatorUnavailableReason = 'RULE_NOT_DEFINED' | 'UNIT_NOT_MODELED' | 'NOT_RECORDED' | 'NO_DEADLINES_CONFIGURED';
export type IndicatorTargetReason = 'NO_TARGET' | 'TARGET_NOT_STORED';

export interface DirectionIndicator {
  code: DirectionIndicatorCode;
  unit: 'PERCENT' | 'COUNT';
  available: boolean;
  unavailableReason: IndicatorUnavailableReason | null;
  value: number | null;
  previousValue: number | null;
  delta: number | null;
  trend: 'UP' | 'DOWN' | 'FLAT' | null;
  higherIsBetter: boolean | null;
  target: number | null;
  targetReason: IndicatorTargetReason | null;
  progress: number | null;
  provisional: boolean;
}

export interface CoverageSeriesPoint { month: string; percent: number | null; recorded: boolean }

export interface DirectionReport {
  month: string;
  previousMonth: string;
  timeZone: string;
  inProgress: boolean;
  header: { greenAreaM2: number; campusHectares: number | null; sections: number; activeTeams: number };
  indicators: DirectionIndicator[];
  coverageSeries: { target: number | null; points: CoverageSeriesPoint[] };
  generatedAt: string;
}
