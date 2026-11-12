'use client';

import type { MonthlyReport as Report, ReportOptions } from '@shared/types';
import { Button, EmptyState, LoadingSkeleton } from '@/components/ui';
import { useMonthlyReport } from '@/hooks/useReports';
import { cn } from '@/lib/cn';
import { EMPTY_MONTHLY_FILTERS, type MonthlyFilters as Filters, type ParsedMonthly } from '@/lib/reportNavigation';
import { SectorBars } from './charts/SectorBars';
import { ComplianceTable } from './monthly/ComplianceTable';
import { MonthlySummary } from './monthly/MonthlySummary';
import { MonthlyVisuals } from './monthly/MonthlyVisuals';
import { SectionLists } from './monthly/SectionLists';
import { MonthlyFilters } from './MonthlyFilters';
import { formatAreaOf, formatPeriod } from './reportFormat';
import { FILTER_TEXTS, MONTHLY_TEXTS } from './reportTexts';

export interface MonthlyReportProps {
  parsed: ParsedMonthly;
  onChange: (filters: Filters) => void;
  options: { data: ReportOptions | null; loading: boolean; errorMessage: string | null; reload: () => void };
}

function Content({ report, filters, options }: { report: Report; filters: Filters; options: ReportOptions | null }) {
  const noOwnTeam = filters.sectorId !== null && options !== null
    && !options.teams.some((team) => team.sectorId === filters.sectorId);
  const noSections = report.coverage.available && report.coverage.totalSections === 0;
  const noWork = report.interventions.approved === 0 && report.coverage.coveredSections === 0;
  return (
    <>
      <p className="text-sm font-medium text-neutral-700">{formatPeriod(report.period.dateFrom, report.period.dateTo)}</p>
      {noOwnTeam && <p className="rounded-md bg-alert-warning-bg p-3 text-sm text-alert-warning-fg">{MONTHLY_TEXTS.noOwnTeam}</p>}
      <MonthlySummary report={report} />
      {noSections ? (
        <EmptyState title={MONTHLY_TEXTS.noSections} description={MONTHLY_TEXTS.noSectionsHelp} />
      ) : (
        <>
          {noWork ? <EmptyState title={MONTHLY_TEXTS.noWork} description={MONTHLY_TEXTS.noWorkHelp} />
            : <MonthlyVisuals report={report} />}
          {report.sectors.length > 0 && (
            <SectorBars title={MONTHLY_TEXTS.sectorsTitle} rows={report.sectors.map((sector) => ({
              key: String(sector.sectorId ?? 'none'), label: sector.name, percent: sector.percent,
              detail: formatAreaOf(sector.coveredAreaM2, sector.totalAreaM2),
            }))} />
          )}
          <ComplianceTable rows={report.compliance} teamFiltered={filters.teamId !== null} />
          <SectionLists mostAttended={report.mostAttended} unattended={report.unattended} />
        </>
      )}
    </>
  );
}

/**
 * Monthly report of the section (SPEC-202 §5.1 step 3, §7.4). An invalid URL
 * is not queried; while a new filter loads, the previous report stays dimmed.
 */
export function MonthlyReport({ parsed, onChange, options }: MonthlyReportProps) {
  const report = useMonthlyReport(parsed.invalid ? null : parsed.filters);
  return (
    <div className="space-y-6">
      <MonthlyFilters filters={parsed.filters} invalid={parsed.invalid} options={options} onChange={onChange} />
      {parsed.invalid ? null : report.errorMessage ? (
        <div role="alert" className="space-y-3 rounded-lg bg-alert-danger-bg p-4 text-alert-danger-fg">
          <p>{MONTHLY_TEXTS.error} {report.errorMessage}</p>
          <Button variant="secondary" size="lg" onClick={report.reload}>{FILTER_TEXTS.retry}</Button>
        </div>
      ) : report.notFound ? (
        <EmptyState title={MONTHLY_TEXTS.notFound}
          action={{ label: FILTER_TEXTS.resetPeriod, onClick: () => onChange(EMPTY_MONTHLY_FILTERS) }} />
      ) : report.data ? (
        <div aria-busy={report.loading} className={cn('space-y-6 transition-opacity', report.loading && 'opacity-60')}>
          <Content report={report.data} filters={parsed.filters} options={options.data} />
        </div>
      ) : (
        <div className="space-y-4" aria-busy="true">
          <LoadingSkeleton variant="card" count={2} />
          <LoadingSkeleton variant="table-row" count={4} />
        </div>
      )}
    </div>
  );
}
