'use client';

import { useId, type ReactNode } from 'react';
import type { DirectionReport as Report, ReportOptions } from '@shared/types';
import { Button, Card, EmptyState, LoadingSkeleton } from '@/components/ui';
import { useDirectionReport } from '@/hooks/useReports';
import { cn } from '@/lib/cn';
import { shiftMonth, type ParsedDirection } from '@/lib/reportNavigation';
import { RingGauge } from './charts/RingGauge';
import { TrendLine } from './charts/TrendLine';
import { DIRECTION_TEXTS } from './direction/directionTexts';
import { IndicatorList } from './direction/IndicatorList';
import { formatArea, formatCount, formatMonth } from './reportFormat';
import { FILTER_TEXTS } from './reportTexts';

export interface DirectionReportProps {
  parsed: ParsedDirection;
  onChange: (month: string | null) => void;
  options: { data: ReportOptions | null };
}

function Tile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Card className="h-full">
      <p className="text-sm font-medium text-neutral-700">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">{children}</p>
    </Card>
  );
}

/** «Mes anterior», a month field and «Mes siguiente», which stops at the current month. */
function MonthPicker({ month, current, onMove }: { month: string | null; current: string | null; onMove: (m: string) => void }) {
  const id = useId();
  return (
    <section aria-label={DIRECTION_TEXTS.month} className="surface-card grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-end">
      <Button variant="secondary" size="lg" disabled={!month} onClick={() => month && onMove(shiftMonth(month, -1))}>
        ← {DIRECTION_TEXTS.previousMonth}
      </Button>
      <div className="space-y-1">
        <label htmlFor={id} className="block text-sm font-medium text-neutral-800">{DIRECTION_TEXTS.month}</label>
        <input id={id} type="month" value={month ?? ''} max={current ?? undefined}
          onChange={(event) => event.target.value && onMove(event.target.value)}
          className="h-11 w-full rounded-lg border border-neutral-300 bg-neutral-0 px-3 text-neutral-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-600" />
      </div>
      <Button variant="secondary" size="lg" disabled={!month || (current !== null && month >= current)}
        onClick={() => month && onMove(shiftMonth(month, 1))}>
        {DIRECTION_TEXTS.nextMonth} →
      </Button>
    </section>
  );
}

function Content({ report }: { report: Report }) {
  const coverage = report.indicators.find((i) => i.code === 'COVERAGE');
  const irrigation = report.indicators.find((i) => i.code === 'IRRIGATION_COVERAGE');
  const { header } = report;
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-2xl font-semibold capitalize text-neutral-900">{formatMonth(report.month)}</p>
        {report.inProgress && (
          <span className="rounded-full bg-status-in-review-bg px-3 py-1 text-sm font-medium text-status-in-review-fg">
            {DIRECTION_TEXTS.partial}
          </span>
        )}
      </div>
      <section aria-label={DIRECTION_TEXTS.headerHeading} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label={DIRECTION_TEXTS.greenArea}>{formatArea(header.greenAreaM2)}</Tile>
        <Tile label={DIRECTION_TEXTS.campus}>
          {header.campusHectares === null ? '—' : DIRECTION_TEXTS.hectares(String(header.campusHectares).replace('.', ','))}
        </Tile>
        <Tile label={DIRECTION_TEXTS.sections}>{formatCount(header.sections)}</Tile>
        <Tile label={DIRECTION_TEXTS.activeTeams}>{formatCount(header.activeTeams)}</Tile>
      </section>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Card>
          <h3 className="mb-4 text-lg font-semibold text-neutral-900">{DIRECTION_TEXTS.gaugesHeading}</h3>
          <div className="grid grid-cols-2 gap-4">
            <RingGauge title={DIRECTION_TEXTS.gaugeCoverage} percent={coverage?.value ?? null} target={coverage?.target ?? null} />
            <RingGauge title={DIRECTION_TEXTS.gaugeIrrigation} percent={irrigation?.value ?? null} target={irrigation?.target ?? null} tone="info" />
          </div>
        </Card>
        <Card>
          <TrendLine title={DIRECTION_TEXTS.trendTitle} points={report.coverageSeries.points}
            target={report.coverageSeries.target} />
        </Card>
      </div>
      <IndicatorList report={report} />
    </>
  );
}

/** Summary for the direction (SPEC-202 §5.1 step 4): campus-wide, one month at a time. */
export function DirectionReport({ parsed, onChange, options }: DirectionReportProps) {
  const report = useDirectionReport(parsed.invalid ? undefined : parsed.month);
  const lastClosed = options.data?.defaults.directionMonth ?? null;
  const current = lastClosed ? shiftMonth(lastClosed, 1) : null;
  const month = parsed.month ?? report.data?.month ?? lastClosed;
  const move = (next: string) => onChange(next === lastClosed ? null : next);

  return (
    <div className="space-y-6">
      <MonthPicker month={month} current={current} onMove={move} />
      {parsed.invalid ? (
        <div role="alert" className="space-y-3 rounded-md bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">
          <p>{DIRECTION_TEXTS.invalid}</p>
          <Button variant="secondary" size="lg" onClick={() => onChange(null)}>{DIRECTION_TEXTS.resetMonth}</Button>
        </div>
      ) : report.errorMessage ? (
        <div role="alert" className="space-y-3 rounded-lg bg-alert-danger-bg p-4 text-alert-danger-fg">
          <p>{DIRECTION_TEXTS.error} {report.errorMessage}</p>
          <Button variant="secondary" size="lg" onClick={report.reload}>{FILTER_TEXTS.retry}</Button>
        </div>
      ) : report.data ? (
        <div aria-busy={report.loading} className={cn('space-y-6 transition-opacity', report.loading && 'opacity-60')}>
          <Content report={report.data} />
        </div>
      ) : report.notFound ? (
        <EmptyState title={DIRECTION_TEXTS.error} />
      ) : (
        <div className="space-y-4" aria-busy="true">
          <LoadingSkeleton variant="card" count={2} />
          <LoadingSkeleton variant="table-row" count={9} />
        </div>
      )}
    </div>
  );
}
