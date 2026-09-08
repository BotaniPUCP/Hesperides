'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSkeleton } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

export type RouteGuardMode = 'protected' | 'guest';

export interface RouteGuardProps {
  children: ReactNode;
  mode?: RouteGuardMode;
}

/**
 * `protected`: sin sesión, a /login. `guest`: con sesión, al inicio — quien ya
 * entró no tiene nada que hacer en el formulario de login.
 *
 * Mientras `isLoading` es true no se renderiza ninguna de las dos ramas: si se
 * mostrara el login durante la comprobación, cualquiera con sesión válida
 * vería parpadear el formulario en cada recarga.
 */
export function RouteGuard({ children, mode = 'protected' }: RouteGuardProps) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const debeRedirigir = !isLoading && (mode === 'protected' ? user === null : user !== null);
  const destino = mode === 'protected' ? '/login' : '/';

  useEffect(() => {
    if (debeRedirigir) {
      router.push(destino);
    }
  }, [debeRedirigir, destino, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <LoadingSkeleton variant="card" className="max-w-md" />
      </div>
    );
  }

  if (debeRedirigir) {
    return null;
  }

  return <>{children}</>;
}
