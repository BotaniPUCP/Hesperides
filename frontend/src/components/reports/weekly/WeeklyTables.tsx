import Link from 'next/link';
import type { ReportTopList, WeeklyIncidentRow, WeeklyNotIrrigated, WeeklyReport, WeeklyWorkRow } from '@shared/types';
import { DataTable, StatusBadge, UrgencyBadge, type DataTableColumn, type UrgencyCode } from '@/components/ui';
import { formatDate } from '../reportFormat';
import { WEEKLY_TEXTS } from './weeklyTexts';

function Board<T>({ id, title, list, columns, rowKey, empty, note }: {
  id: string; title: string; list: ReportTopList<T>; columns: DataTableColumn<T>[];
  rowKey: (row: T) => number; empty: string; note?: string;
}) {
  return (
    <section aria-labelledby={id} className="space-y-2">
      <h3 id={id} className="text-lg font-semibold text-neutral-900">{title}</h3>
      {note && <p className="text-sm text-neutral-700">{note}</p>}
      {list.total > list.items.length && (
        <p className="text-sm text-neutral-700">{WEEKLY_TEXTS.showing(list.items.length, list.total)}</p>
      )}
      {/* A capped board, not a listing (D-11): no page beyond the first exists. */}
      <DataTable columns={columns} rows={list.items} rowKey={rowKey} totalElements={list.items.length} page={0}
        pageSize={Math.max(list.items.length, 1)} onPageChange={() => undefined}
        emptyState={<p className="text-sm text-neutral-700">{empty}</p>} />
    </section>
  );
}

const WORK_COLUMNS: DataTableColumn<WeeklyWorkRow>[] = [
  { key: 'code', header: WEEKLY_TEXTS.code },
  { key: 'type', header: WEEKLY_TEXTS.type, render: (row) => row.typeLabel ?? row.classLabel },
  { key: 'places', header: WEEKLY_TEXTS.places, render: (row) => row.places.map((place) => place.label).join(', ') || '—' },
  { key: 'executed', header: WEEKLY_TEXTS.executed, render: (row) => formatDate(row.lastExecutionDate) },
];

const DRY_COLUMNS: DataTableColumn<WeeklyNotIrrigated>[] = [
  { key: 'section', header: 'Sección', render: (row) => `${row.name} (${row.code})` },
  {
    key: 'last', header: WEEKLY_TEXTS.lastIrrigated,
    render: (row) => (row.lastIrrigatedOn ? formatDate(row.lastIrrigatedOn) : WEEKLY_TEXTS.neverIrrigated),
  },
];

function incidentColumns(linkToDetail: boolean): DataTableColumn<WeeklyIncidentRow>[] {
  return [
    {
      key: 'description', header: WEEKLY_TEXTS.description,
      render: (row) => (
        <span className="block max-w-md">
          {linkToDetail ? (
            <Link href={`/incidencias/${row.id}`} className="font-medium text-brand-700 underline-offset-2 hover:underline">
              {row.description}
            </Link>
          ) : <span className="font-medium text-neutral-900">{row.description}</span>}
          {row.locationReference && <span className="block text-xs text-neutral-700">{row.locationReference}</span>}
        </span>
      ),
    },
    {
      key: 'urgency', header: WEEKLY_TEXTS.urgency,
      render: (row) => (row.urgency
        ? <UrgencyBadge code={row.urgency.code as UrgencyCode} label={row.urgency.label} /> : WEEKLY_TEXTS.noUrgency),
    },
    { key: 'status', header: WEEKLY_TEXTS.status, render: (row) => <StatusBadge code={row.status.code} label={row.status.label} /> },
    { key: 'team', header: WEEKLY_TEXTS.teams, render: (row) => row.teamName ?? '—', hideOnMobile: true },
    { key: 'days', header: WEEKLY_TEXTS.days, render: (row) => WEEKLY_TEXTS.daysValue(row.daysOpen) },
  ];
}

/**
 * The work, what was left dry and the open incidents of the week. ADMIN reads
 * the summarized incidents but does not get the link to their detail (§2.5).
 */
export function WeeklyTables({ report, linkIncidents }: { report: WeeklyReport; linkIncidents: boolean }) {
  const { incidents } = report;
  return (
    <div className="space-y-8">
      <Board id="weekly-works" title={WEEKLY_TEXTS.worksTitle} list={report.interventions.items} columns={WORK_COLUMNS}
        rowKey={(row) => row.id} empty={WEEKLY_TEXTS.noWork} />
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Board id="weekly-dry" title={WEEKLY_TEXTS.notIrrigatedTitle} list={report.irrigation.notIrrigated}
          columns={DRY_COLUMNS} rowKey={(row) => row.sectionId} empty={WEEKLY_TEXTS.allIrrigated} />
        <Board id="weekly-incidents" title={WEEKLY_TEXTS.incidentsTitle} list={incidents.items}
          columns={incidentColumns(linkIncidents)} rowKey={(row) => row.id} empty={WEEKLY_TEXTS.noIncidents}
          note={[WEEKLY_TEXTS.incidentsAsOf(formatDate(incidents.asOf)),
            incidents.unlocatedInScope ? WEEKLY_TEXTS.unlocated(incidents.unlocatedInScope) : ''].join(' ').trim()} />
      </div>
    </div>
  );
}
