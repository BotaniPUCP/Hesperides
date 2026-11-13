'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from './useAuth';
import { useRequest } from './useRequest';
import { demoDirection, demoMonthly, demoOptions, demoSections, demoWeekly } from '@/components/reports/demo/demoReports';
import { rememberListQuery } from '@/lib/listMemory';
import { useReportDemo } from '@/lib/reportDemo';
import { reportsApi } from '@/lib/reports-api';
import {
  allowedTabs, directionHref, monthlyHref, parseDirection, parseMonthly, parseWeekly, resolveTab, tabHref,
  weeklyHref, type MonthlyFilters, type ReportTab, type WeeklyParams,
} from '@/lib/reportNavigation';

/**
 * The reader goes into every key, so a response never leaks from one account
 * to another; so does the demo switch, so demo figures never pass for real ones.
 */
function useReportScope(): string | null {
  const { user } = useAuth();
  const [demo] = useReportDemo();
  if (!user || allowedTabs(user.role.code).length === 0) return null;
  return `${user.id}:${user.role.code}${demo ? ':demo' : ''}`;
}

function useRevision() {
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  return { revision, reload };
}

/** The demo answers at once from the JSON files instead of the backend. */
function source<T>(demo: boolean, fromDemo: () => T, fromApi: () => Promise<T>): () => Promise<T> {
  return demo ? () => Promise.resolve(fromDemo()) : fromApi;
}

export function useReportOptions() {
  const scope = useReportScope();
  const [demo] = useReportDemo();
  const { revision, reload } = useRevision();
  const request = useRequest(scope ? `${scope}:report-options:${revision}` : null,
    source(demo, demoOptions, () => reportsApi.options()));
  return { ...request, reload };
}

export function useReportSections(sectorId: number | null) {
  const scope = useReportScope();
  const [demo] = useReportDemo();
  return useRequest(scope && sectorId ? `${scope}:report-sections:${sectorId}` : null,
    source(demo, demoSections, () => reportsApi.sections(sectorId as number)));
}

/** With {@code params} null (invalid URL or no sector yet) nothing is requested. */
export function useWeeklyReport(params: WeeklyParams | null) {
  const scope = useReportScope();
  const [demo] = useReportDemo();
  const { revision, reload } = useRevision();
  const request = useRequest(scope && params ? JSON.stringify([scope, 'weekly', params, revision]) : null,
    source(demo, () => demoWeekly(params as WeeklyParams), () => reportsApi.weekly(params as WeeklyParams)),
    { keepPreviousData: true });
  return { ...request, reload };
}

/**
 * With {@code filters} null (invalid URL) nothing is requested. While a new
 * filter loads, the previous report stays on screen, dimmed (§5.1).
 */
export function useMonthlyReport(filters: MonthlyFilters | null) {
  const scope = useReportScope();
  const [demo] = useReportDemo();
  const { revision, reload } = useRevision();
  const request = useRequest(scope && filters ? JSON.stringify([scope, 'monthly', filters, revision]) : null,
    source(demo, () => demoMonthly(filters as MonthlyFilters), () => reportsApi.monthly(filters as MonthlyFilters)),
    { keepPreviousData: true });
  return { ...request, reload };
}

/** {@code month} undefined means an invalid URL: nothing is requested. */
export function useDirectionReport(month: string | null | undefined) {
  const scope = useReportScope();
  const [demo] = useReportDemo();
  const { revision, reload } = useRevision();
  const request = useRequest(scope && month !== undefined ? JSON.stringify([scope, 'direction', month, revision]) : null,
    source(demo, () => demoDirection(month ?? null), () => reportsApi.direction(month ?? null)),
    { keepPreviousData: true });
  return { ...request, reload };
}

/**
 * The tab and its parameters live in the URL (SPEC-202 D-13). Changing tab is a
 * push, so Back returns to the previous tab; an invalid or forbidden tab is
 * replaced without an error. Filters replace the current entry, as in the
 * incidents list, so typing does not flood the history.
 */
export function useReportNavigation(role: string | null) {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get('tab');
  const tab = role ? resolveTab(raw, role) : null;
  const mustReplace = tab !== null && raw !== tab;
  const query = params.toString();

  // Quien salga a Frecuencias y regrese con la flecha debe encontrar la misma pestaña y filtros.
  useEffect(() => {
    rememberListQuery('/reportes', query);
  }, [query]);

  useEffect(() => {
    if (mustReplace && tab) router.replace(tabHref(tab), { scroll: false });
  }, [mustReplace, tab, router]);

  const selectTab = useCallback((next: ReportTab) => router.push(tabHref(next), { scroll: false }), [router]);
  const monthly = useMemo(() => parseMonthly(params), [params]);
  const weekly = useMemo(() => parseWeekly(params), [params]);
  const direction = useMemo(() => parseDirection(params), [params]);
  const changeMonthly = useCallback((filters: MonthlyFilters) => {
    window.history.replaceState(null, '', monthlyHref(filters));
  }, []);
  const changeWeekly = useCallback((next: WeeklyParams) => {
    window.history.replaceState(null, '', weeklyHref(next));
  }, []);
  const changeDirection = useCallback((month: string | null) => {
    window.history.replaceState(null, '', directionHref(month));
  }, []);

  return { tab, selectTab, monthly, changeMonthly, weekly, changeWeekly, direction, changeDirection };
}
