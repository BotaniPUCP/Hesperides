'use client';

import { useState } from 'react';
import type { ReportOptions } from '@shared/types';
import { DateRangePicker, type DateRangePreset } from '@/components/forms/DateRangePicker';
import { Button, Select, type SelectOption } from '@/components/ui';
import { useReportSections } from '@/hooks/useReports';
import {
  activeMonthlyFilters, EMPTY_MONTHLY_FILTERS, parseIsoDate, type MonthlyFilters as Filters,
} from '@/lib/reportNavigation';
import { FILTER_TEXTS } from './reportTexts';

interface OptionsRequest {
  data: ReportOptions | null;
  loading: boolean;
  errorMessage: string | null;
  reload: () => void;
}

export interface MonthlyFiltersProps {
  filters: Filters;
  invalid: boolean;
  options: OptionsRequest;
  onChange: (filters: Filters) => void;
}

const MAX_RANGE_DAYS = 366;

function selectValue(options: SelectOption[], id: number | null): string | null {
  return options.find((option) => option.id === id)?.code ?? null;
}

function previousMonth(directionMonth: string): DateRangePreset {
  const [year, month] = directionMonth.split('-').map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const from = `${directionMonth}-01`;
  return { label: FILTER_TEXTS.previousMonth, range: { from, to: `${directionMonth}-${String(last).padStart(2, '0')}` } };
}

/**
 * The period is edited as a draft: the URL only changes once both dates are
 * set and valid, or both are cleared. Remounted by key when the URL changes.
 */
function PeriodField({ filters, presets, onChange }: {
  filters: Filters; presets: DateRangePreset[]; onChange: (filters: Filters) => void;
}) {
  const [draft, setDraft] = useState({ from: filters.dateFrom, to: filters.dateTo });
  const from = parseIsoDate(draft.from);
  const to = parseIsoDate(draft.to);
  const tooLong = typeof from === 'number' && typeof to === 'number' && (to - from) / 86_400_000 + 1 > MAX_RANGE_DAYS;

  function change(range: { from: string | null; to: string | null }) {
    setDraft(range);
    const a = parseIsoDate(range.from);
    const b = parseIsoDate(range.to);
    if (a === null && b === null) onChange({ ...filters, dateFrom: null, dateTo: null });
    else if (typeof a === 'number' && typeof b === 'number' && b >= a && (b - a) / 86_400_000 + 1 <= MAX_RANGE_DAYS) {
      onChange({ ...filters, dateFrom: range.from, dateTo: range.to });
    }
  }

  return <DateRangePicker label={FILTER_TEXTS.period} value={draft} onChange={change} presets={presets}
    errorMessage={tooLong ? FILTER_TEXTS.rangeTooLong : undefined} />;
}

export function MonthlyFilters({ filters, invalid, options, onChange }: MonthlyFiltersProps) {
  const sections = useReportSections(filters.sectorId);
  const data = options.data;
  const sectorOptions = (data?.sectors ?? []).map((s) => ({ id: s.id, code: s.code, label: s.name }));
  const sectionOptions = (sections.data ?? []).map((s) => ({ id: s.id, code: s.code, label: `${s.name} (${s.code})` }));
  const teamOptions = (data?.teams ?? []).map((t) => ({ id: t.id, code: t.code, label: t.name }));
  const classOptions = data?.classes ?? [];
  const typeOptions = classOptions.find((c) => c.id === filters.classItemId)?.types ?? [];
  const presets: DateRangePreset[] = [{ label: FILTER_TEXTS.currentMonth, range: { from: null, to: null } }];
  if (data) presets.push(previousMonth(data.defaults.directionMonth));
  const busy = options.loading || Boolean(options.errorMessage);

  return (
    <section aria-label={FILTER_TEXTS.toggle(activeMonthlyFilters(filters))}
      className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-0 p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-3">
          <PeriodField key={`${filters.dateFrom}|${filters.dateTo}`} filters={filters} presets={presets} onChange={onChange} />
        </div>
        <Select id="monthly-sector" label={FILTER_TEXTS.sector} size="lg" clearable placeholder={FILTER_TEXTS.all}
          options={sectorOptions} value={selectValue(sectorOptions, filters.sectorId)} loading={options.loading} disabled={busy}
          onChange={(o) => onChange({ ...filters, sectorId: o?.id ?? null, sectionId: null })} />
        <Select id="monthly-section" label={FILTER_TEXTS.section} size="lg" clearable placeholder={FILTER_TEXTS.allFemale}
          options={sectionOptions} value={selectValue(sectionOptions, filters.sectionId)} loading={sections.loading}
          disabled={filters.sectorId === null || busy} searchable
          onChange={(o) => onChange({ ...filters, sectionId: o?.id ?? null })} />
        <Select id="monthly-team" label={FILTER_TEXTS.team} size="lg" clearable placeholder={FILTER_TEXTS.allFemale}
          options={teamOptions} value={selectValue(teamOptions, filters.teamId)} loading={options.loading} disabled={busy}
          onChange={(o) => onChange({ ...filters, teamId: o?.id ?? null })} />
        <Select id="monthly-class" label={FILTER_TEXTS.activityClass} size="lg" clearable placeholder={FILTER_TEXTS.allFemale}
          options={classOptions} value={selectValue(classOptions, filters.classItemId)} loading={options.loading} disabled={busy}
          onChange={(o) => onChange({ ...filters, classItemId: o?.id ?? null, typeItemId: null })} />
        <Select id="monthly-type" label={FILTER_TEXTS.activityType} size="lg" clearable placeholder={FILTER_TEXTS.all}
          options={typeOptions} value={selectValue(typeOptions, filters.typeItemId)}
          disabled={filters.classItemId === null || busy}
          onChange={(o) => onChange({ ...filters, typeItemId: o?.id ?? null })} />
      </div>
      {options.errorMessage && (
        <div role="alert" className="space-y-3 rounded-md bg-alert-warning-bg p-3 text-sm text-alert-warning-fg">
          <p>{FILTER_TEXTS.optionsError} {options.errorMessage}</p>
          <Button variant="secondary" size="lg" onClick={options.reload}>{FILTER_TEXTS.retry}</Button>
        </div>
      )}
      {invalid && (
        <div role="alert" className="space-y-3 rounded-md bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">
          <p>{FILTER_TEXTS.invalidUrl}</p>
          <Button variant="secondary" size="lg" onClick={() => onChange(EMPTY_MONTHLY_FILTERS)}>{FILTER_TEXTS.resetPeriod}</Button>
        </div>
      )}
    </section>
  );
}
