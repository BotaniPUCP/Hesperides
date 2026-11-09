'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { BackButton, Breadcrumb } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { HOME_ITEM, isActivePath } from '@/lib/navigation';
import { buildPageTrail } from '@/lib/pageTrail';
import { PageTrailProvider, usePageTrailDetails } from './PageTrailContext';

/** El mapa ocupa toda la ventana: un marco le quitaría justo lo que lo hace útil. */
const FULL_BLEED_PATHS = ['/mapa'];

/**
 * El hueco de la flecha y la altura de la fila existen aunque no haya flecha:
 * así el breadcrumb y el contenido no se mueven según cómo se llegó a la pantalla.
 */
function PageNav({ pathname }: { pathname: string }) {
  const { user } = useAuth();
  const details = usePageTrailDetails();
  const trail = buildPageTrail(pathname, { withHome: Boolean(user), ...details });
  const parentHref = trail.findLast((item) => item.href)?.href;

  return (
    <div data-testid="page-nav" className="mb-6 flex min-h-9 items-center gap-2">
      <div className="h-9 w-9 shrink-0">{pathname !== HOME_ITEM.href && <BackButton fallbackHref={parentHref} />}</div>
      <Breadcrumb items={trail} className="min-w-0" />
    </div>
  );
}

/**
 * Ancho, breadcrumb y punto de inicio de toda pantalla. Se declaran aquí y en
 * ningún otro sitio, para que moverse entre módulos no cambie la estructura.
 */
export function PageFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  if (FULL_BLEED_PATHS.some((path) => isActivePath(pathname, path))) return <>{children}</>;

  return (
    <PageTrailProvider>
      <div data-page-frame className="mx-auto w-full max-w-7xl">
        <PageNav pathname={pathname} />
        {children}
      </div>
    </PageTrailProvider>
  );
}
