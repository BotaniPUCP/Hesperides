'use client';

import { useId } from 'react';
import type { ReportOptions } from '@shared/types';
import { Button, Select, type SelectOption } from '@/components/ui';
import { mondayOf, shiftWeeks, type WeeklyParams } from '@/lib/reportNavigation';
import { FILTER_TEXTS } from './reportTexts';
import { WEEKLY_TEXTS } from './weekly/weeklyTexts';

export interface WeeklyFiltersProps {
  params: WeeklyParams;
  /** The Monday shown: the URL's, or the default of the options. */
  weekStart: string | null;
  currentWeek: string | null;
  options: { data: ReportOptions | null; loading: boolean; errorMessage: string | null; reload: () => void };
  onChange: (params: WeeklyParams) => void;
}

/** The Sunday that closes a week: the date picker cannot go past the current one. */
function sundayOf(monday: string): string {
  return new Date(Date.parse(`${monday}T00:00:00Z`) + 6 * 86_400_000).toISOString().slice(0, 10);
}

/** «Semana anterior» and «Semana siguiente»; the next one stops at the current week (§3.3). */
export function WeekNav({ weekStart, currentWeek, onMove }: {
  weekStart: string | null; currentWeek: string | null; onMove: (weekStart: string) => void;
}) {
  const atCurrent = weekStart !== null && currentWeek !== null && weekStart >= currentWeek;
  return (
    <div className="grid grid-cols-2 gap-3">
      <Button variant="secondary" size="lg" disabled={weekStart === null}
        onClick={() => weekStart && onMove(shiftWeeks(weekStart, -1))}>← {WEEKLY_TEXTS.previousWeek}</Button>
      <Button variant="secondary" size="lg" disabled={weekStart === null || atCurrent}
        onClick={() => weekStart && onMove(shiftWeeks(weekStart, 1))}>{WEEKLY_TEXTS.nextWeek} →</Button>
    </div>
  );
}

export function WeeklyFilters({ params, weekStart, currentWeek, options, onChange }: WeeklyFiltersProps) {
  const dayId = useId();
  const sectors: SelectOption[] = (options.data?.sectors ?? []).map((s) => ({ id: s.id, code: s.code, label: s.name }));
  const sectorValue = sectors.find((s) => s.id === params.sectorId)?.code ?? null;
  const move = (next: string) => onChange({ ...params, weekStart: currentWeek && next >= currentWeek ? null : next });

  return (
    <section aria-label={WEEKLY_TEXTS.kpisHeading} className="surface-card space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Select id="weekly-sector" label={WEEKLY_TEXTS.sector} size="lg" options={sectors} value={sectorValue}
          loading={options.loading} disabled={options.loading || Boolean(options.errorMessage)}
          onChange={(o) => o && onChange({ ...params, sectorId: o.id })} />
        <div className="space-y-1">
          <label htmlFor={dayId} className="block text-sm font-medium text-neutral-800">{WEEKLY_TEXTS.pickDay}</label>
          <input id={dayId} type="date" value={weekStart ?? ''} max={currentWeek ? sundayOf(currentWeek) : undefined}
            onChange={(event) => event.target.value && move(mondayOf(event.target.value))}
            className="h-11 w-full rounded-lg border border-neutral-300 bg-neutral-0 px-3 text-neutral-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-600" />
          <p className="text-xs text-neutral-700">{WEEKLY_TEXTS.pickDayHelp}</p>
        </div>
        <div className="hidden self-end sm:block lg:col-span-1 sm:col-span-2">
          <WeekNav weekStart={weekStart} currentWeek={currentWeek} onMove={move} />
        </div>
      </div>
      {options.errorMessage && (
        <div role="alert" className="space-y-3 rounded-md bg-alert-warning-bg p-3 text-sm text-alert-warning-fg">
          <p>{FILTER_TEXTS.optionsError} {options.errorMessage}</p>
          <Button variant="secondary" size="lg" onClick={options.reload}>{FILTER_TEXTS.retry}</Button>
        </div>
      )}
    </section>
  );
}
