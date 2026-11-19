'use client';

import { useEffect, useRef, useState } from 'react';
import { PageHeader } from '@/components/layouts/PageHeader';
import { Button, EmptyState } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useReportNavigation, useReportOptions } from '@/hooks/useReports';
import { useReportDemo } from '@/lib/reportDemo';
import { allowedTabs, type ReportTab } from '@/lib/reportNavigation';
import { DirectionReport } from './DirectionReport';
import { MonthlyReport } from './MonthlyReport';
import { ReportTabs, panelId, tabId } from './ReportTabs';
import { DEMO_TEXTS, SCREEN_TEXTS, TAB_TEXTS } from './reportTexts';
import { WeeklyReport } from './WeeklyReport';

/** Switches the screen between the real figures and the JSON demonstration, and says which one is shown. */
function DemoSwitch() {
  const [demo, setDemo] = useReportDemo();
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {demo ? (
        <p role="status" className="rounded-md bg-status-in-review-bg px-3 py-2 text-sm font-medium text-status-in-review-fg">
          {DEMO_TEXTS.banner}
        </p>
      ) : <span />}
      <Button variant={demo ? 'secondary' : 'ghost'} size="md" onClick={() => setDemo(!demo)}>
        {demo ? DEMO_TEXTS.turnOff : DEMO_TEXTS.turnOn}
      </Button>
    </div>
  );
}

/**
 * One screen, three tabs (SPEC-202 D-13). Only the active panel is mounted, so
 * only its endpoint is requested; an error in one panel never reaches another.
 */
export function ReportsScreen() {
  const { user } = useAuth();
  const role = user?.role.code ?? null;
  const tabs = allowedTabs(role);
  const navigation = useReportNavigation(tabs.length > 0 ? role : null);
  const { tab, selectTab } = navigation;
  const [demo] = useReportDemo();
  const options = useReportOptions();
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
      <PageHeader title={SCREEN_TEXTS.title} description={role === 'SUPERVISOR' && SCREEN_TEXTS.supervisorNotice} />
      {tabs.length === 0 || !tab ? (
        <EmptyState title={SCREEN_TEXTS.noAccessTitle} description={SCREEN_TEXTS.noAccessDescription} />
      ) : (
        <>
          <DemoSwitch />
          <ReportTabs tabs={tabs} active={tab} onActivate={activate} />
          <p aria-live="polite" className="sr-only">{announcement}</p>
          <div role="tabpanel" id={panelId(tab)} aria-labelledby={tabId(tab)} tabIndex={0}
            className="surface-card space-y-6 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2">
            <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold text-neutral-900 focus:outline-hidden">
              {TAB_TEXTS[tab].label}
            </h2>
            {tab === 'semanal' && (
              <WeeklyReport parsed={navigation.weekly} onChange={navigation.changeWeekly} options={options}
                linkIncidents={!demo && (role === 'COORDINADOR' || role === 'SUPERVISOR')} />
            )}
            {tab === 'mensual' && (
              <MonthlyReport parsed={navigation.monthly} onChange={navigation.changeMonthly} options={options} />
            )}
            {tab === 'direccion' && (
              <DirectionReport parsed={navigation.direction} onChange={navigation.changeDirection} options={options} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
