import type { ReactNode } from 'react';
import type { WeeklyReport } from '@shared/types';
import { Card } from '@/components/ui';
import { categorical } from '../charts/chartTones';
import { DonutChart } from '../charts/DonutChart';
import { ProgressMeter } from '../charts/ProgressMeter';
import { ReportBadge, VariationBadge } from '../charts/ReportBadge';
import { formatCount, formatPercent } from '../reportFormat';
import { CHART_TEXTS } from '../reportTexts';
import { WEEKLY_TEXTS } from './weeklyTexts';

function Kpi({ label, value, children }: { label: string; value: number; children?: ReactNode }) {
  return (
    <Card className="h-full">
      <p className="text-sm font-medium text-neutral-700">{label}</p>
      <p className="mt-2 text-4xl font-semibold tracking-tight text-neutral-900">{formatCount(value)}</p>
      <div className="mt-1 space-y-1 text-sm text-neutral-700">{children}</div>
    </Card>
  );
}

/** KPIs, the two meters and the work by type (SPEC-202 §7.1 «Semanal»). */
export function WeeklySummary({ report }: { report: WeeklyReport }) {
  const { interventions: work, attendedSections: attended, irrigation, incidents } = report;
  const delta = work.approved - work.approvedPreviousWeek;
  const types = categorical(work.byType.map((t) => ({ key: String(t.typeItemId ?? t.typeLabel), label: t.typeLabel, value: t.approved })),
    CHART_TEXTS.others);

  return (
    <section aria-labelledby="weekly-kpis" className="space-y-6">
      <h3 id="weekly-kpis" className="sr-only">{WEEKLY_TEXTS.kpisHeading}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label={WEEKLY_TEXTS.approved} value={work.approved}>
          <VariationBadge trend={delta > 0 ? 'UP' : delta < 0 ? 'DOWN' : 'FLAT'} higherIsBetter={true}
            label={WEEKLY_TEXTS.vsPrevious(delta)} />
        </Kpi>
        <Kpi label={WEEKLY_TEXTS.pendingApproval} value={work.pendingApproval}>
          <p className="text-xs">{WEEKLY_TEXTS.pendingApprovalHelp}</p>
        </Kpi>
        <Kpi label={WEEKLY_TEXTS.pendingPhotos} value={work.pendingPhotos}>
          <p className="text-xs">{WEEKLY_TEXTS.pendingPhotosHelp}</p>
        </Kpi>
        <Kpi label={WEEKLY_TEXTS.openIncidents} value={incidents.open}>
          <p className="text-xs">{WEEKLY_TEXTS.openIncidentsHelp(incidents.pendingApproval)}</p>
        </Kpi>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="space-y-6">
          <ProgressMeter label={WEEKLY_TEXTS.attended} percent={attended.percent}
            headline={formatPercent(attended.percent) ?? CHART_TEXTS.noData}
            valueText={WEEKLY_TEXTS.attendedText(attended.covered, attended.total)}
            footnote={<p className="flex flex-wrap items-center gap-2 text-xs text-neutral-700">
              <ReportBadge kind="PROVISIONAL" />{WEEKLY_TEXTS.attendedRule}</p>} />
          {irrigation.turns === 0 ? (
            <div className="space-y-1">
              <p className="text-sm font-medium text-neutral-700">{WEEKLY_TEXTS.irrigation}</p>
              <p className="font-semibold text-neutral-900">{WEEKLY_TEXTS.noTurn}</p>
              <p className="text-xs text-neutral-700">{WEEKLY_TEXTS.noTurnHelp}</p>
            </div>
          ) : (
            <ProgressMeter label={WEEKLY_TEXTS.irrigation} percent={irrigation.percent} tone="info"
              headline={formatPercent(irrigation.percent) ?? CHART_TEXTS.noData}
              valueText={WEEKLY_TEXTS.irrigationText(irrigation.irrigatedSections, irrigation.totalSections, irrigation.turns)}
              footnote={<p className="flex flex-wrap items-center gap-2 text-xs text-neutral-700">
                <ReportBadge kind="PROVISIONAL" />{WEEKLY_TEXTS.irrigationRule}</p>} />
          )}
        </Card>
        <Card>
          <DonutChart title={WEEKLY_TEXTS.byTypeTitle} segments={types} totalLabel={WEEKLY_TEXTS.byTypeTotal} />
        </Card>
      </div>
    </section>
  );
}
