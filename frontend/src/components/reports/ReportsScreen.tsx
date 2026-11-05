'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Breadcrumb, EmptyState } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useReportNavigation } from '@/hooks/useReports';
import { allowedTabs, type ReportTab } from '@/lib/reportNavigation';
import { ReportTabs, panelId, tabId } from './ReportTabs';
import { SCREEN_TEXTS, TAB_TEXTS } from './reportTexts';

/**
 * One screen, three tabs (SPEC-202 D-13). Only the active panel is mounted, so
 * only its endpoint is requested; an error in one panel never reaches another.
 */
export function ReportsScreen() {
  const { user } = useAuth();
  const role = user?.role.code ?? null;
  const tabs = allowedTabs(role);
  const { tab, selectTab } = useReportNavigation(tabs.length > 0 ? role : null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const activatedByUser = useRef(false);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (!activatedByUser.current || !tab) return;
    activatedByUser.current = false;
    headingRef.current?.focus();
    setAnnouncement(SCREEN_TEXTS.showing(tab));
  }, [tab]);

  function activate(next: ReportTab) {
    if (next === tab) return;
    activatedByUser.current = true;
    selectTab(next);
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Breadcrumb items={[{ label: SCREEN_TEXTS.breadcrumbHome, href: '/' }, { label: SCREEN_TEXTS.title }]} />
        <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">{SCREEN_TEXTS.title}</h1>
        {role === 'SUPERVISOR' && <p className="text-sm text-neutral-700">{SCREEN_TEXTS.supervisorNotice}</p>}
      </header>
      {tabs.length === 0 || !tab ? (
        <EmptyState title={SCREEN_TEXTS.noAccessTitle} description={SCREEN_TEXTS.noAccessDescription} />
      ) : (
        <>
          <ReportTabs tabs={tabs} active={tab} onActivate={activate} />
          <p aria-live="polite" className="sr-only">{announcement}</p>
          <div role="tabpanel" id={panelId(tab)} aria-labelledby={tabId(tab)} tabIndex={0}
            className="space-y-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2">
            <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold text-neutral-900 focus:outline-none">
              {TAB_TEXTS[tab].label}
            </h2>
            {panel(tab)}
          </div>
        </>
      )}
    </div>
  );
}

function panel(tab: ReportTab): ReactNode {
  switch (tab) {
    default:
      return <EmptyState title={SCREEN_TEXTS.comingSoonTitle} description={SCREEN_TEXTS.comingSoonDescription} />;
  }
}
