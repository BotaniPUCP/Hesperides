import type { ActivityCompliance } from '@shared/types';
import { DataTable, type DataTableColumn } from '@/components/ui';
import { ReportBadge } from '../charts/ReportBadge';
import { formatDate } from '../reportFormat';
import { BADGE_TEXTS, COMPLIANCE_TEXTS } from '../reportTexts';

function Verdicts({ row }: { row: ActivityCompliance }) {
  if (!row.evaluable) {
    return (
      <span className="flex flex-col items-start gap-1">
        <ReportBadge kind="NOT_EVALUABLE" />
        {row.notEvaluableReason && <span className="text-xs">{COMPLIANCE_TEXTS.notEvaluable[row.notEvaluableReason]}</span>}
      </span>
    );
  }
  const counts = [
    ['OVERDUE', row.overdue], ['EARLY', row.early],
    ['ON_TARGET', row.onTarget], ['NOT_APPLICABLE', row.notApplicable],
  ] as const;
  const visible = counts.filter(([, count]) => count > 0);
  if (visible.length === 0) return <span>{COMPLIANCE_TEXTS.noPlaces}</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {visible.map(([kind, count]) => <ReportBadge key={kind} kind={kind} label={`${BADGE_TEXTS[kind]} (${count})`} />)}
    </span>
  );
}

const COLUMNS: DataTableColumn<ActivityCompliance>[] = [
  { key: 'activityLabel', header: COMPLIANCE_TEXTS.activity },
  { key: 'status', header: COMPLIANCE_TEXTS.status, render: (row) => <Verdicts row={row} /> },
  {
    key: 'overdueTargets', header: COMPLIANCE_TEXTS.overdueTargets,
    render: (row) => row.overdueTargets.length === 0 ? '—' : (
      <ul className="space-y-1">
        {row.overdueTargets.map((target) => (
          <li key={`${target.targetKind}-${target.targetId}`}>
            <span className="font-medium text-neutral-900">{target.label}</span>
            {target.lastExecutionDate && <span>, {COMPLIANCE_TEXTS.lastExecution(formatDate(target.lastExecutionDate))}</span>}
          </li>
        ))}
      </ul>
    ),
  },
];

/** Compliance per activity (SPEC-202 D-05): what is not evaluable never looks compliant. */
export function ComplianceTable({ rows, teamFiltered }: { rows: ActivityCompliance[]; teamFiltered: boolean }) {
  return (
    <section aria-labelledby="monthly-compliance" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="monthly-compliance" className="text-lg font-semibold text-neutral-900">{COMPLIANCE_TEXTS.title}</h3>
      </div>
      {teamFiltered && <p className="text-sm text-neutral-700">{COMPLIANCE_TEXTS.teamDoesNotApply}</p>}
      <DataTable columns={COLUMNS} rows={rows} rowKey={(row) => row.activityTypeItemId}
        totalElements={rows.length} page={0} pageSize={Math.max(rows.length, 1)} onPageChange={() => undefined}
        emptyState={<p className="text-sm text-neutral-700">{COMPLIANCE_TEXTS.empty}</p>} />
    </section>
  );
}
