/**
 * Tabs and URL parameters of /reportes (SPEC-202 D-13). Pure functions, so the
 * rules of who sees which tab and which parameters each tab keeps are tested
 * without mounting components. The backend validates again: hiding a tab is
 * not a security measure.
 */

export type ReportTab = 'semanal' | 'mensual' | 'direccion';

export const REPORT_TABS: readonly ReportTab[] = ['semanal', 'mensual', 'direccion'];

const TABS_BY_ROLE: Record<string, readonly ReportTab[]> = {
  ADMIN: REPORT_TABS,
  COORDINADOR: REPORT_TABS,
  // The summary covers the whole campus, so the foreman does not get it (D-07).
  SUPERVISOR: ['semanal', 'mensual'],
};

export function allowedTabs(role: string | null | undefined): readonly ReportTab[] {
  return (role && TABS_BY_ROLE[role]) || [];
}

/** The foreman opens their weekly report; the office opens the monthly one. */
export function defaultTab(role: string): ReportTab {
  return role === 'SUPERVISOR' ? 'semanal' : 'mensual';
}

/** A missing, invalid or forbidden tab falls back to the role's default. */
export function resolveTab(raw: string | null, role: string): ReportTab {
  const allowed = allowedTabs(role);
  return allowed.includes(raw as ReportTab) ? (raw as ReportTab) : defaultTab(role);
}

/** Changing tab discards the other tabs' parameters (§3.6). */
export function tabHref(tab: ReportTab): string {
  return `/reportes?tab=${tab}`;
}

export interface MonthlyFilters {
  dateFrom: string | null;
  dateTo: string | null;
  sectorId: number | null;
  sectionId: number | null;
  teamId: number | null;
  classItemId: number | null;
  typeItemId: number | null;
}

export const EMPTY_MONTHLY_FILTERS: MonthlyFilters = {
  dateFrom: null, dateTo: null, sectorId: null, sectionId: null, teamId: null, classItemId: null, typeItemId: null,
};

const ID_KEYS = ['sectorId', 'sectionId', 'teamId', 'classItemId', 'typeItemId'] as const;
const MAX_RANGE_DAYS = 366;
const DAY_MS = 86_400_000;

export interface ParsedMonthly {
  filters: MonthlyFilters;
  /** True when the URL carries something the backend would reject; the panel then does not query. */
  invalid: boolean;
}

function parseId(raw: string | null): number | null | undefined {
  if (raw === null || raw === '') return null;
  if (!/^[1-9]\d{0,15}$/.test(raw)) return undefined;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : undefined;
}

export function parseIsoDate(raw: string | null): number | null | undefined {
  if (raw === null || raw === '') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return undefined;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const time = Date.UTC(year, month - 1, day);
  const date = new Date(time);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? time : undefined;
}

/** Reads the monthly parameters with the same shape rules as the backend (§3.4). */
export function parseMonthly(params: Pick<URLSearchParams, 'get'>): ParsedMonthly {
  const filters: MonthlyFilters = { ...EMPTY_MONTHLY_FILTERS };
  let invalid = false;
  for (const key of ID_KEYS) {
    const value = parseId(params.get(key));
    if (value === undefined) invalid = true;
    else filters[key] = value;
  }
  const from = parseIsoDate(params.get('dateFrom'));
  const to = parseIsoDate(params.get('dateTo'));
  if (from === undefined || to === undefined || (from === null) !== (to === null)) {
    invalid = true;
  } else if (from !== null && to !== null) {
    if (to < from || (to - from) / DAY_MS + 1 > MAX_RANGE_DAYS) invalid = true;
    else {
      filters.dateFrom = params.get('dateFrom');
      filters.dateTo = params.get('dateTo');
    }
  }
  return { filters, invalid };
}

function monthlyQuery(filters: MonthlyFilters): URLSearchParams {
  const params = new URLSearchParams({ tab: 'mensual' });
  if (filters.dateFrom && filters.dateTo) {
    params.set('dateFrom', filters.dateFrom);
    params.set('dateTo', filters.dateTo);
  }
  for (const key of ID_KEYS) {
    const value = filters[key];
    if (value !== null) params.set(key, String(value));
  }
  return params;
}

export function monthlyHref(filters: MonthlyFilters): string {
  return `/reportes?${monthlyQuery(filters)}`;
}

/** How many filters besides the period are set: the mobile toggle shows «Filtros (n)». */
export function activeMonthlyFilters(filters: MonthlyFilters): number {
  return ID_KEYS.filter((key) => filters[key] !== null).length + (filters.dateFrom ? 1 : 0);
}
