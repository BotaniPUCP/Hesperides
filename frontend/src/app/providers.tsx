'use client';

import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui';
import { AuthProvider } from '@/lib/auth-context';

/**
 * Los providers viven en su propio archivo de cliente para que layout.tsx
 * siga siendo un Server Component: marcarlo entero con 'use client' obligaría
 * a que toda la aplicación se renderice en el cliente.
 *
 * AuthProvider va por fuera porque ToastProvider no depende de la sesión,
 * pero cualquier pantalla que muestre un toast al fallar el login sí necesita
 * ambos, y este orden hace que los dos estén disponibles a la vez.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>{children}</ToastProvider>
    </AuthProvider>
  );
}
