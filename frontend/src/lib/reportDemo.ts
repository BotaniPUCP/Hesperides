'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Whether the reports screen shows the demonstration data. It is a per-viewer
 * convenience kept for the browser session, so it survives a change of tab or
 * a reload; storage may be blocked, and then it simply starts off.
 */
const KEY = 'hesperides:reportes-demo';
const listeners = new Set<() => void>();
let current: boolean | null = null;

function read(): boolean {
  if (current !== null) return current;
  try {
    current = window.sessionStorage.getItem(KEY) === '1';
  } catch {
    current = false;
  }
  return current;
}

function write(on: boolean) {
  current = on;
  try {
    if (on) window.sessionStorage.setItem(KEY, '1');
    else window.sessionStorage.removeItem(KEY);
  } catch {
    // Without storage the choice lasts until the page is closed.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useReportDemo(): [boolean, (on: boolean) => void] {
  const demo = useSyncExternalStore(subscribe, read, () => false);
  const set = useCallback((on: boolean) => write(on), []);
  return [demo, set];
}

/** Test hook: forget the cached value between tests. */
export function resetReportDemo() {
  current = null;
}
