import { format } from 'date-fns';
import type { DirectionReport, MonthlyReport, ReportOptions, ReportSection, WeeklyReport } from '@shared/types';
import {
  mondayOf, parseIsoDate, shiftMonth, type MonthlyFilters, type WeeklyParams,
} from '@/lib/reportNavigation';
import directionJson from './direction.json';
import monthlyJson from './monthly.json';
import optionsJson from './options.json';
import sectionsJson from './sections.json';
import weeklyJson from './weekly.json';

/**
 * Demonstration data for the reports screen: the JSON files of this folder,
 * moved to the period the viewer chose so the filters still behave. Nothing
 * here reaches the backend, and the screen labels the data as a demonstration.
 */

const DAY_MS = 86_400_000;

function today(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

function shiftDays(iso: string, days: number): string {
  const time = parseIsoDate(iso);
  return typeof time === 'number' ? new Date(time + days * DAY_MS).toISOString().slice(0, 10) : iso;
}

function daysBetween(from: string, to: string): number {
  return Math.round(((parseIsoDate(to) as number) - (parseIsoDate(from) as number)) / DAY_MS);
}

function clone<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function monthBounds(month: string): { from: string; to: string } {
  const [year, value] = month.split('-').map(Number);
  const last = new Date(Date.UTC(year, value, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` };
}

export function demoOptions(): ReportOptions {
  const options = clone<ReportOptions>(optionsJson);
  const now = today();
  const month = now.slice(0, 7);
  const bounds = monthBounds(month);
  options.defaults = {
    weekStart: mondayOf(now),
    monthly: { dateFrom: bounds.from, dateTo: bounds.to },
    directionMonth: shiftMonth(month, -1),
  };
  return options;
}

export function demoSections(): ReportSection[] {
  return clone<ReportSection[]>(sectionsJson);
}

export function demoWeekly(params: WeeklyParams): WeeklyReport {
  const report = clone<WeeklyReport>(weeklyJson);
  const now = today();
  const start = params.weekStart ?? mondayOf(now);
  const shift = daysBetween(report.week.weekStart, start);
  const end = shiftDays(start, 6);
  const inProgress = now <= end;
  report.week = { ...report.week, weekStart: start, weekEnd: end, inProgress, cutoffDate: inProgress ? now : end };
  report.incidents.asOf = report.week.cutoffDate;
  for (const item of report.interventions.items.items) {
    item.lastExecutionDate = shiftDays(item.lastExecutionDate, shift);
    if (item.approvedOn) item.approvedOn = shiftDays(item.approvedOn, shift);
  }
  for (const item of report.irrigation.notIrrigated.items) {
    if (item.lastIrrigatedOn) item.lastIrrigatedOn = shiftDays(item.lastIrrigatedOn, shift);
  }
  for (const item of report.incidents.items.items) item.reportedOn = shiftDays(item.reportedOn, shift);
  const sector = optionsJson.sectors.find((s) => s.id === params.sectorId);
  if (sector) {
    report.sector = { ...report.sector, id: sector.id, code: sector.code, name: sector.name };
    const team = optionsJson.teams.find((t) => t.sectorId === sector.id);
    report.teams = team ? [{ id: team.id, name: team.name, supervisorName: 'Capataz de demostración' }] : [];
  }
  return report;
}

export function demoMonthly(filters: MonthlyFilters): MonthlyReport {
  const report = clone<MonthlyReport>(monthlyJson);
  const bounds = monthBounds(today().slice(0, 7));
  const from = filters.dateFrom ?? bounds.from;
  const to = filters.dateTo ?? bounds.to;
  const shift = daysBetween(report.period.dateFrom, from);
  report.period = { ...report.period, dateFrom: from, dateTo: to };
  for (const row of [...report.mostAttended.items, ...report.unattended.items]) {
    if (row.lastAttendedOn) row.lastAttendedOn = shiftDays(row.lastAttendedOn, shift);
  }
  for (const activity of report.compliance) {
    for (const target of activity.overdueTargets) {
      if (target.lastExecutionDate) target.lastExecutionDate = shiftDays(target.lastExecutionDate, shift);
    }
  }
  const sector = report.sectors.find((row) => row.sectorId === filters.sectorId);
  if (sector) {
    // A sector filter narrows the demo to that sector, so the figures react like the real report.
    report.sectors = [sector];
    report.coverage = {
      ...report.coverage, coveredAreaM2: sector.coveredAreaM2, totalAreaM2: sector.totalAreaM2,
      percent: sector.percent, coveredSections: sector.coveredSections, totalSections: sector.totalSections,
      sectionsWithoutArea: 0,
    };
    report.interventions = { ...report.interventions, approved: sector.approvedInterventions };
    const keep = (row: { sectorName: string }) => row.sectorName === sector.name;
    report.mostAttended = { total: report.mostAttended.items.filter(keep).length, items: report.mostAttended.items.filter(keep) };
    report.unattended = { total: report.unattended.items.filter(keep).length, items: report.unattended.items.filter(keep) };
  }
  return report;
}

export function demoDirection(month: string | null): DirectionReport {
  const report = clone<DirectionReport>(directionJson);
  const current = today().slice(0, 7);
  const target = month ?? shiftMonth(current, -1);
  report.month = target;
  report.previousMonth = shiftMonth(target, -1);
  report.inProgress = target === current;
  report.coverageSeries.points = report.coverageSeries.points.map((point, index, all) => ({
    ...point, month: shiftMonth(target, index - (all.length - 1)),
  }));
  return report;
}
