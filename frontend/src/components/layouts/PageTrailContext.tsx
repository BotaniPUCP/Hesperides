'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { BreadcrumbItem } from '@/components/ui/Breadcrumb';

export interface PageTrailDetails {
  labels?: Readonly<Record<string, string>>;
  parents?: readonly BreadcrumbItem[];
}

interface PageTrailContextValue {
  details: PageTrailDetails | null;
  setDetails: (details: PageTrailDetails | null) => void;
}

// Sin marco, como en un test de la pantalla sola, no hay ruta que completar.
const PageTrailContext = createContext<PageTrailContextValue>({ details: null, setDetails: () => undefined });

export function PageTrailProvider({ children }: { children: ReactNode }) {
  const [details, setDetails] = useState<PageTrailDetails | null>(null);
  const value = useMemo(() => ({ details, setDetails }), [details]);
  return <PageTrailContext.Provider value={value}>{children}</PageTrailContext.Provider>;
}

export function usePageTrailDetails(): PageTrailDetails | null {
  return useContext(PageTrailContext).details;
}

/**
 * Lo único del breadcrumb que el marco no puede saber: los datos ya cargados de
 * una ficha, como el nombre de la especie en vez de su slug.
 */
export function usePageTrail(details: PageTrailDetails): void {
  const { setDetails } = useContext(PageTrailContext);
  // Por contenido: el objeto es nuevo en cada render y dispararía el efecto sin fin.
  const key = JSON.stringify(details);

  useEffect(() => {
    setDetails(JSON.parse(key) as PageTrailDetails);
    return () => setDetails(null);
  }, [key, setDetails]);
}
