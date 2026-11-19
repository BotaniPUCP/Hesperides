import type { MonthlySectionRow, ReportTopList } from '@shared/types';
import { DataTable, type DataTableColumn } from '@/components/ui';
import type { MonthlyFilters } from '@/lib/reportNavigation';
import { InterventionDrilldown } from '../InterventionDrilldown';
import { formatArea, formatCount, formatDate } from '../reportFormat';
import { DRILLDOWN_TEXTS, SECTION_LIST_TEXTS } from '../reportTexts';

/** A section with approved work opens those works (D-20); one without them only shows its 0. */
function columns(filters: MonthlyFilters): DataTableColumn<MonthlySectionRow>[] {
  return [
    { key: 'section', header: SECTION_LIST_TEXTS.section, render: (row) => `${row.name} (${row.code})` },
    { key: 'sectorName', header: SECTION_LIST_TEXTS.sector },
    { key: 'area', header: SECTION_LIST_TEXTS.area, render: (row) => (row.areaM2 === null ? '—' : formatArea(row.areaM2)) },
    {
      key: 'works', header: SECTION_LIST_TEXTS.works,
      render: (row) => (row.approvedInterventions > 0 ? (
        <InterventionDrilldown kind="ATTENDED_SECTION" filters={{ ...filters, sectionId: row.sectionId }}
          total={row.approvedInterventions} label={DRILLDOWN_TEXTS.openSection(formatCount(row.approvedInterventions))}
          ariaLabel={DRILLDOWN_TEXTS.openSectionLabel(row.name)} title={DRILLDOWN_TEXTS.sectionTitle(row.name)} />
      ) : formatCount(row.approvedInterventions)),
    },
    {
      key: 'lastAttendedOn', header: SECTION_LIST_TEXTS.lastAttended,
      render: (row) => (row.lastAttendedOn ? formatDate(row.lastAttendedOn) : SECTION_LIST_TEXTS.never),
    },
  ];
}

function SectionList({ id, title, list, empty, filters }: {
  id: string; title: string; list: ReportTopList<MonthlySectionRow>; empty: string; filters: MonthlyFilters;
}) {
  return (
    <section aria-labelledby={id} className="space-y-2">
      <h3 id={id} className="text-lg font-semibold text-neutral-900">{title}</h3>
      {list.total > list.items.length && (
        <p className="text-sm text-neutral-700">{SECTION_LIST_TEXTS.showing(list.items.length, list.total)}</p>
      )}
      {/* A capped board, not a listing (D-11): no page beyond the first exists. */}
      <DataTable columns={columns(filters)} rows={list.items} rowKey={(row) => row.sectionId}
        totalElements={list.items.length} page={0} pageSize={Math.max(list.items.length, 1)} onPageChange={() => undefined}
        emptyState={<p className="text-sm text-neutral-700">{empty}</p>} />
    </section>
  );
}

/**
 * The ten most attended sections and the ten longest without attention (§3.6).
 * {@code filters} carry the resolved period of the report.
 */
export function SectionLists({ mostAttended, unattended, filters }: {
  mostAttended: ReportTopList<MonthlySectionRow>; unattended: ReportTopList<MonthlySectionRow>; filters: MonthlyFilters;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <SectionList id="monthly-most-attended" title={SECTION_LIST_TEXTS.mostAttended} list={mostAttended}
        empty={SECTION_LIST_TEXTS.emptyMost} filters={filters} />
      <SectionList id="monthly-unattended" title={SECTION_LIST_TEXTS.unattended} list={unattended}
        empty={SECTION_LIST_TEXTS.emptyUnattended} filters={filters} />
    </div>
  );
}
