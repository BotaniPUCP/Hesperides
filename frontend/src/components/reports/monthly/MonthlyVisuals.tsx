import type { MonthlyReport } from '@shared/types';
import { Card } from '@/components/ui';
import { categorical } from '../charts/chartTones';
import { DonutChart, type DonutSegment } from '../charts/DonutChart';
import { RingGauge } from '../charts/RingGauge';
import { formatArea } from '../reportFormat';
import { BADGE_TEXTS, CHART_TEXTS, MONTHLY_TEXTS } from '../reportTexts';

/**
 * The period at a glance: coverage as a ring and three part-to-whole donuts.
 * Incidents and compliance use status colors because their color means a state;
 * the sectors use the categorical order, with the tail folded into «Otros».
 */
export function MonthlyVisuals({ report }: { report: MonthlyReport }) {
  const { coverage, incidents } = report;
  const states = MONTHLY_TEXTS.incidentStates;
  const incidentSegments: DonutSegment[] = [
    { key: 'pending', label: states.PENDING_APPROVAL, value: incidents.pendingApproval, tone: 'neutral' },
    { key: 'open', label: states.OPEN, value: incidents.open, tone: 'warning' },
    { key: 'progress', label: states.IN_PROGRESS, value: incidents.inProgress, tone: 'info' },
    { key: 'resolved', label: states.RESOLVED, value: incidents.resolvedInPeriod, tone: 'brand' },
  ];
  const evaluable = report.compliance.filter((row) => row.evaluable);
  const sum = (pick: (row: (typeof evaluable)[number]) => number) => evaluable.reduce((total, row) => total + pick(row), 0);
  const complianceSegments: DonutSegment[] = [
    { key: 'on', label: BADGE_TEXTS.ON_TARGET, value: sum((r) => r.onTarget), tone: 'brand' },
    { key: 'tolerance', label: BADGE_TEXTS.WITHIN_TOLERANCE, value: sum((r) => r.withinTolerance), tone: 'warning' },
    { key: 'overdue', label: BADGE_TEXTS.OVERDUE, value: sum((r) => r.overdue), tone: 'danger' },
    { key: 'na', label: BADGE_TEXTS.NOT_APPLICABLE, value: sum((r) => r.notApplicable), tone: 'neutral' },
  ];
  const sectors = categorical([...report.sectors]
    .filter((row) => row.approvedInterventions > 0)
    .sort((a, b) => b.approvedInterventions - a.approvedInterventions)
    .map((row) => ({ key: String(row.sectorId ?? 'none'), label: row.name, value: row.approvedInterventions })),
  CHART_TEXTS.others);

  return (
    <section aria-labelledby="monthly-visuals" className="space-y-3">
      <h3 id="monthly-visuals" className="text-lg font-semibold text-neutral-900">{MONTHLY_TEXTS.visualHeading}</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {/* Without coverage the summary card already says why; a ring would only repeat «Sin datos». */}
        {coverage.available && (
          <Card className="flex items-center justify-center">
            <RingGauge title={MONTHLY_TEXTS.coverageRing} percent={coverage.percent}
              caption={MONTHLY_TEXTS.coverageRingCaption(formatArea(coverage.coveredAreaM2), formatArea(coverage.totalAreaM2))} />
          </Card>
        )}
        <Card>
          <DonutChart title={MONTHLY_TEXTS.incidentsDonut} segments={incidentSegments}
            totalLabel={MONTHLY_TEXTS.incidentsDonutTotal} />
        </Card>
        <Card>
          <DonutChart title={MONTHLY_TEXTS.complianceDonut} caption={MONTHLY_TEXTS.complianceDonutCaption}
            segments={complianceSegments} totalLabel={MONTHLY_TEXTS.complianceDonutTotal} />
        </Card>
        <Card>
          <DonutChart title={MONTHLY_TEXTS.worksDonut} segments={sectors} totalLabel={MONTHLY_TEXTS.worksDonutTotal} />
        </Card>
      </div>
    </section>
  );
}
