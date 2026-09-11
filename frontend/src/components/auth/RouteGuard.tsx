'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LoadingSkeleton } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

export type RouteGuardMode = 'protected' | 'guest';

/** Única ruta accesible con la contraseña temporal todavía vigente. */
const PASSWORD_CHANGE_PATH = '/cambiar-password';

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
 *
 * Con la contraseña temporal aún vigente desvía a /cambiar-password. Es el
 * espejo de PasswordChangeRequiredFilter en el backend, que responde 403 a
 * cualquier otro endpoint: sin este desvío la persona entraría a una pantalla
 * que solo puede mostrar errores.
 */
export function RouteGuard({ children, mode = 'protected' }: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  // La propia pantalla de cambio se excluye: redirigir hacia donde ya estamos
  // sería un bucle de navegación.
  const debeCambiarPassword =
    user !== null && user.mustChangePassword && pathname !== PASSWORD_CHANGE_PATH;

  const faltaSesion = mode === 'protected' ? user === null : user !== null;
  const debeRedirigir = !isLoading && (faltaSesion || debeCambiarPassword);

  const destino = faltaSesion
    ? mode === 'protected'
      ? '/login'
      : '/'
    : PASSWORD_CHANGE_PATH;

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
