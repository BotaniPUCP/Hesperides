'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { ReportInterventionKind, ReportInterventionRow } from '@shared/types';
import { Button, LoadingSkeleton, Modal } from '@/components/ui';
import { useReportInterventions, type InterventionListRequest } from '@/hooks/useReports';
import { cn } from '@/lib/cn';
import type { MonthlyFilters } from '@/lib/reportNavigation';
import { formatDate } from './reportFormat';
import { DRILLDOWN_TEXTS, FILTER_TEXTS } from './reportTexts';

export interface InterventionDrilldownProps {
  kind: ReportInterventionKind;
  /** The report's own filters, with the period already resolved: the list must match the figure. */
  filters: MonthlyFilters;
  /** The figure the list opens; at 0 there is nothing to open. */
  total: number;
  /** Text of the trigger; «Ver cuáles» by default. */
  label?: string;
  /** Accessible name of the trigger, when its text alone does not say what it opens. */
  ariaLabel?: string;
  /** Title of the dialog; by default the one of {@code kind}. */
  title?: string;
  className?: string;
}

function Row({ row, linked }: { row: ReportInterventionRow; linked: boolean }) {
  const details = [
    row.teamName ?? DRILLDOWN_TEXTS.noTeam,
    row.lastExecutionDate ? DRILLDOWN_TEXTS.executed(formatDate(row.lastExecutionDate)) : DRILLDOWN_TEXTS.notExecuted,
    row.pendingPhotos > 0 ? DRILLDOWN_TEXTS.pendingPhotos(row.pendingPhotos) : '',
  ].filter(Boolean);
  return (
    <li className="py-3">
      <p className="flex flex-wrap items-baseline gap-x-2">
        {linked ? (
          <Link href={`/intervenciones/${row.id}`}
            className="font-semibold text-brand-700 underline-offset-2 hover:underline">{row.code}</Link>
        ) : <span className="font-semibold text-neutral-900">{row.code}</span>}
        <span className="text-neutral-900">{row.typeLabel ?? row.classLabel}</span>
      </p>
      <p className="text-sm text-neutral-700">{details.join(' · ')}</p>
    </li>
  );
}

function DrilldownList({ request }: { request: InterventionListRequest }) {
  const list = useReportInterventions(request);
  if (list.errorMessage) {
    return (
      <div role="alert" className="space-y-3 rounded-lg bg-alert-danger-bg p-4 text-alert-danger-fg">
        <p>{DRILLDOWN_TEXTS.error} {list.errorMessage}</p>
        <Button variant="secondary" onClick={list.reload}>{FILTER_TEXTS.retry}</Button>
      </div>
    );
  }
  if (!list.data) {
    return <div aria-busy="true"><p className="sr-only">{DRILLDOWN_TEXTS.loading}</p><LoadingSkeleton variant="table-row" count={4} /></div>;
  }
  const { total, items } = list.data;
  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-700">{list.demo ? DRILLDOWN_TEXTS.demo : DRILLDOWN_TEXTS.help}</p>
      {total > items.length && <p className="text-sm text-neutral-700">{DRILLDOWN_TEXTS.showing(items.length, total)}</p>}
      {items.length === 0 ? <p className="text-sm text-neutral-700">{DRILLDOWN_TEXTS.empty}</p> : (
        <ul className="divide-y divide-neutral-200">
          {items.map((row) => <Row key={row.id} row={row} linked={!list.demo} />)}
        </ul>
      )}
    </div>
  );
}

/**
 * Opens the works behind a report figure (SPEC-202 D-20): each one links to its
 * detail in Intervenciones, which keeps its own access rules, and the arrow of
 * that detail returns here with the same tab and filters. The list is asked
 * only when opened, so the report itself costs no extra query.
 */
export function InterventionDrilldown({ kind, filters, total, label, ariaLabel, title, className }: InterventionDrilldownProps) {
  const [open, setOpen] = useState(false);
  if (total <= 0) return null;
  return (
    <>
      <button type="button" aria-label={ariaLabel} aria-haspopup="dialog" onClick={() => setOpen(true)}
        className={cn('inline-flex min-h-11 items-center text-sm font-medium text-brand-700 underline underline-offset-2',
          'rounded hover:text-brand-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-600', className)}>
        {label ?? DRILLDOWN_TEXTS.open}
      </button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title={title ?? DRILLDOWN_TEXTS.titles[kind]} size="lg"
        footer={<Button variant="secondary" onClick={() => setOpen(false)}>{DRILLDOWN_TEXTS.close}</Button>}>
        {open && <DrilldownList request={{ kind, filters, total }} />}
      </Modal>
    </>
  );
}
