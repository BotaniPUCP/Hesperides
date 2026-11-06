'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from './useAuth';
import { useRequest } from './useRequest';
import { reportsApi } from '@/lib/reports-api';
import {
  allowedTabs, parseMonthly, monthlyHref, resolveTab, tabHref, type MonthlyFilters, type ReportTab,
} from '@/lib/reportNavigation';

/** The reader goes into every key, so a response never leaks from one account to another. */
function useReportScope(): string | null {
  const { user } = useAuth();
  return user && allowedTabs(user.role.code).length > 0 ? `${user.id}:${user.role.code}` : null;
}

function useRevision() {
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  return { revision, reload };
}

export function useReportOptions() {
  const scope = useReportScope();
  const { revision, reload } = useRevision();
  const request = useRequest(scope ? `${scope}:report-options:${revision}` : null, () => reportsApi.options());
  return { ...request, reload };
}

export function useReportSections(sectorId: number | null) {
  const scope = useReportScope();
  const request = useRequest(scope && sectorId ? `${scope}:report-sections:${sectorId}` : null,
    () => reportsApi.sections(sectorId as number));
  return request;
}

/**
 * With {@code filters} null (invalid URL) nothing is requested. While a new
 * filter loads, the previous report stays on screen, dimmed (§5.1).
 */
export function useMonthlyReport(filters: MonthlyFilters | null) {
  const scope = useReportScope();
  const { revision, reload } = useRevision();
  const request = useRequest(scope && filters ? JSON.stringify([scope, 'monthly', filters, revision]) : null,
    () => reportsApi.monthly(filters as MonthlyFilters), { keepPreviousData: true });
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

  useEffect(() => {
    if (mustReplace && tab) router.replace(tabHref(tab), { scroll: false });
  }, [mustReplace, tab, router]);

  const selectTab = useCallback((next: ReportTab) => router.push(tabHref(next), { scroll: false }), [router]);
  const monthly = useMemo(() => parseMonthly(params), [params]);
  const changeMonthly = useCallback((filters: MonthlyFilters) => {
    window.history.replaceState(null, '', monthlyHref(filters));
  }, []);

  return { tab, selectTab, monthly, changeMonthly };
}
