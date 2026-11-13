'use client';

import type { ReportOptions, WeeklyReport as Report } from '@shared/types';
import { Button, EmptyState, LoadingSkeleton } from '@/components/ui';
import { useWeeklyReport } from '@/hooks/useReports';
import { cn } from '@/lib/cn';
import type { ParsedWeekly, WeeklyParams } from '@/lib/reportNavigation';
import { formatDate } from './reportFormat';
import { FILTER_TEXTS } from './reportTexts';
import { WeekNav, WeeklyFilters } from './WeeklyFilters';
import { WeeklySummary } from './weekly/WeeklySummary';
import { WeeklyTables } from './weekly/WeeklyTables';
import { WEEKLY_TEXTS } from './weekly/weeklyTexts';

export interface WeeklyReportProps {
  parsed: ParsedWeekly;
  onChange: (params: WeeklyParams) => void;
  options: { data: ReportOptions | null; loading: boolean; errorMessage: string | null; reload: () => void };
  /** COORDINADOR and SUPERVISOR open an incident's detail; ADMIN only reads the summary (§2.5). */
  linkIncidents: boolean;
}

function Heading({ report }: { report: Report }) {
  const { week, sector, teams } = report;
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-neutral-700">
        {WEEKLY_TEXTS.week(formatDate(week.weekStart).replace(/ de \d{4}$/, ''), formatDate(week.weekEnd))}
        {week.inProgress && <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-900">{WEEKLY_TEXTS.inProgress}</span>}
      </p>
      <p className="text-2xl font-semibold text-neutral-900">{sector.name}</p>
      <p className="text-sm text-neutral-700">
        {teams.length === 0 ? WEEKLY_TEXTS.noTeam : teams.map((team) => (
          team.supervisorName ? `${team.name} · ${WEEKLY_TEXTS.foreman(team.supervisorName)}` : team.name)).join(' — ')}
      </p>
    </div>
  );
}

/**
 * Weekly report of the sector (SPEC-202 §5.1 step 2). The sector is preselected
 * with the first one of the options; the foreman's week navigation is repeated
 * at the bottom on a phone, where the thumb reaches it (§7.3).
 */
export function WeeklyReport({ parsed, onChange, options, linkIncidents }: WeeklyReportProps) {
  const sectors = options.data?.sectors ?? null;
  const sectorId = parsed.params.sectorId ?? sectors?.[0]?.id ?? null;
  const params = { ...parsed.params, sectorId };
  const report = useWeeklyReport(parsed.invalid || sectorId === null ? null : params);
  const currentWeek = options.data?.defaults.weekStart ?? null;
  const weekStart = parsed.params.weekStart ?? currentWeek ?? report.data?.week.weekStart ?? null;
  const move = (next: string) => onChange({ ...params, weekStart: currentWeek && next >= currentWeek ? null : next });

  if (parsed.params.sectorId === null && sectors !== null && sectors.length === 0) {
    return <EmptyState title={WEEKLY_TEXTS.noSectorTitle} description={WEEKLY_TEXTS.noSectorHelp} />;
  }

  return (
    <div className="space-y-6">
      <WeeklyFilters params={params} weekStart={weekStart} currentWeek={currentWeek} options={options} onChange={onChange} />
      {parsed.invalid ? (
        <div role="alert" className="space-y-3 rounded-md bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">
          <p>{WEEKLY_TEXTS.invalid}</p>
          <Button variant="secondary" size="lg" onClick={() => onChange({ weekStart: null, sectorId: null })}>
            {WEEKLY_TEXTS.resetWeek}
          </Button>
        </div>
      ) : sectorId === null ? (
        options.loading ? <LoadingSkeleton variant="card" count={2} /> : <EmptyState title={WEEKLY_TEXTS.needsSector} />
      ) : report.errorMessage ? (
        <div role="alert" className="space-y-3 rounded-lg bg-alert-danger-bg p-4 text-alert-danger-fg">
          <p>{WEEKLY_TEXTS.error} {report.errorMessage}</p>
          <Button variant="secondary" size="lg" onClick={report.reload}>{FILTER_TEXTS.retry}</Button>
        </div>
      ) : report.notFound ? (
        <EmptyState title={WEEKLY_TEXTS.notFound}
          action={{ label: WEEKLY_TEXTS.resetWeek, onClick: () => onChange({ weekStart: null, sectorId: null }) }} />
      ) : report.data ? (
        <div aria-busy={report.loading} className={cn('space-y-8 transition-opacity', report.loading && 'opacity-60')}>
          <Heading report={report.data} />
          <WeeklySummary report={report.data} />
          <WeeklyTables report={report.data} linkIncidents={linkIncidents} />
        </div>
      ) : (
        <div className="space-y-4" aria-busy="true">
          <LoadingSkeleton variant="card" count={2} />
          <LoadingSkeleton variant="table-row" count={4} />
        </div>
      )}
      <div className="sm:hidden">
        <WeekNav weekStart={weekStart} currentWeek={currentWeek} onMove={move} />
      </div>
    </div>
  );
}
