'use client';

import { useRef, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';
import type { ReportTab } from '@/lib/reportNavigation';
import { SCREEN_TEXTS, TAB_TEXTS } from './reportTexts';

export interface ReportTabsProps {
  tabs: readonly ReportTab[];
  active: ReportTab;
  onActivate: (tab: ReportTab) => void;
}

export const tabId = (tab: ReportTab) => `report-tab-${tab}`;
export const panelId = (tab: ReportTab) => `report-panel-${tab}`;

/**
 * WAI-ARIA tabs with manual activation (SPEC-202 §7.2): arrows, Home and End
 * only move the focus; Enter or Space activate, because every tab triggers a
 * query and must not request one just by passing the focus over it.
 */
export function ReportTabs({ tabs, active, onActivate }: ReportTabsProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = refs.current.findIndex((button) => button === document.activeElement);
    if (current < 0) return;
    const last = tabs.length - 1;
    const next = event.key === 'ArrowRight' ? (current === last ? 0 : current + 1)
      : event.key === 'ArrowLeft' ? (current === 0 ? last : current - 1)
        : event.key === 'Home' ? 0
          : event.key === 'End' ? last
            : null;
    if (next === null) return;
    event.preventDefault();
    refs.current[next]?.focus();
  }

  return (
    <div role="tablist" aria-label={SCREEN_TEXTS.tablistLabel} onKeyDown={onKeyDown}
      className="grid auto-cols-fr grid-flow-col rounded-xl border border-neutral-200 bg-neutral-0 px-2 sm:flex sm:gap-2">
      {tabs.map((tab, index) => {
        const selected = tab === active;
        return (
          <button key={tab} ref={(element) => { refs.current[index] = element; }} type="button" role="tab"
            id={tabId(tab)} aria-selected={selected} aria-controls={panelId(tab)} aria-label={TAB_TEXTS[tab].label}
            tabIndex={selected ? 0 : -1} onClick={() => onActivate(tab)}
            className={cn(
              'min-h-11 min-w-0 border-b-2 px-3 py-2 text-sm font-semibold transition-colors sm:px-4 sm:text-base',
              'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2',
              selected ? 'border-brand-600 text-brand-700' : 'border-transparent text-neutral-700 hover:text-neutral-900',
            )}>
            <span className="sm:hidden">{TAB_TEXTS[tab].shortLabel}</span>
            <span className="hidden sm:inline">{TAB_TEXTS[tab].label}</span>
          </button>
        );
      })}
    </div>
  );
}
