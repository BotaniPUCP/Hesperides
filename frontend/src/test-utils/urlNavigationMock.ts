import { useMemo, useSyncExternalStore } from 'react';

/**
 * Doble de next/navigation para pantallas cuya fuente de verdad es la URL: como
 * el router real, avisa a useSearchParams cuando cambia el historial.
 */
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

for (const method of ['pushState', 'replaceState'] as const) {
  const original = window.history[method].bind(window.history);
  window.history[method] = (...args: Parameters<History['pushState']>) => {
    original(...args);
    listeners.forEach((listener) => listener());
  };
}

export const urlNavigationMock = {
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), refresh: jest.fn(), prefetch: jest.fn() }),
  usePathname: () => window.location.pathname,
  useSearchParams: () => {
    const search = useSyncExternalStore(subscribe, () => window.location.search);
    return useMemo(() => new URLSearchParams(search), [search]);
  },
};
