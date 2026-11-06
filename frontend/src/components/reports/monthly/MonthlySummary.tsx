import type { ReactNode } from 'react';
import type { MonthlyReport } from '@shared/types';
import { Card } from '@/components/ui';
import { ReportBadge } from '../charts/ReportBadge';
import { formatAreaOf, formatCount, formatPercent } from '../reportFormat';
import { MONTHLY_TEXTS } from '../reportTexts';

function Kpi({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Card className="h-full">
      <p className="text-sm font-medium text-neutral-700">{label}</p>
      <div className="mt-2 space-y-1">{children}</div>
    </Card>
  );
}

/** Coverage, approved work and incidents of the period (SPEC-202 §5.1 step 3). */
export function MonthlySummary({ report }: { report: MonthlyReport }) {
  const { coverage, interventions, incidents } = report;
  return (
    <section aria-labelledby="monthly-kpis" className="space-y-3">
      <h3 id="monthly-kpis" className="sr-only">{MONTHLY_TEXTS.kpisHeading}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label={MONTHLY_TEXTS.coverage}>
          {coverage.available ? (
            <>
              <p className="flex flex-wrap items-center gap-2">
                <span className="text-3xl font-semibold text-neutral-900">{formatPercent(coverage.percent) ?? '—'}</span>
                <ReportBadge kind="PROVISIONAL" />
              </p>
              <p className="text-sm text-neutral-700">{formatAreaOf(coverage.coveredAreaM2, coverage.totalAreaM2)}</p>
              <p className="text-sm text-neutral-700">{MONTHLY_TEXTS.sectionsOf(coverage.coveredSections, coverage.totalSections)}</p>
              {coverage.sectionsWithoutArea > 0 && (
                <p className="text-xs text-neutral-700">{MONTHLY_TEXTS.sectionsWithoutArea(coverage.sectionsWithoutArea)}</p>
              )}
              <p className="text-xs text-neutral-700">{MONTHLY_TEXTS.coverageRule}</p>
            </>
          ) : (
            <>
              <ReportBadge kind="NO_DATA" />
              <p className="text-sm text-neutral-700">
                {coverage.unavailableReason ? MONTHLY_TEXTS.coverageUnavailable[coverage.unavailableReason] : null}
              </p>
            </>
          )}
        </Kpi>
        <Kpi label={MONTHLY_TEXTS.approved}>
          <p className="text-3xl font-semibold text-neutral-900">{formatCount(interventions.approved)}</p>
        </Kpi>
        <Kpi label={MONTHLY_TEXTS.pendingApproval}>
          <p className="text-3xl font-semibold text-neutral-900">{formatCount(interventions.pendingApproval)}</p>
          <p className="text-xs text-neutral-700">{MONTHLY_TEXTS.pendingApprovalHelp}</p>
        </Kpi>
        <Kpi label={MONTHLY_TEXTS.incidents}>
          <p className="text-lg font-semibold text-neutral-900">{MONTHLY_TEXTS.incidentsOpen(incidents.open, incidents.inProgress)}</p>
          <p className="text-sm text-neutral-700">{MONTHLY_TEXTS.incidentsPending(incidents.pendingApproval)}</p>
          <p className="text-sm text-neutral-700">{MONTHLY_TEXTS.incidentsFlow(incidents.reportedInPeriod, incidents.resolvedInPeriod)}</p>
        </Kpi>
      </div>
    </section>
  );
}
