'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { parseMonthly, monthlyHref, resolveTab, tabHref, type MonthlyFilters, type ReportTab } from '@/lib/reportNavigation';

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
