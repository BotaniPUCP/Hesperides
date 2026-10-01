import type { ReactNode } from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/layouts/AppShell';

/**
 * Toda pantalla con sesión vive en este grupo de rutas: el guard y el sidebar
 * se declaran una sola vez aquí y no en cada página. El paréntesis del nombre
 * no forma parte de la URL, así que /admin/usuarios sigue siendo esa ruta.
 *
 * /login y /cambiar-password quedan fuera a propósito: la primera es para quien
 * no tiene sesión, y la segunda no debe ofrecer navegación mientras la
 * contraseña temporal siga vigente (el guard desvía todo lo demás hacia ella).
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RouteGuard>
      <AppShell>{children}</AppShell>
    </RouteGuard>
  );
}
