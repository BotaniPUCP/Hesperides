'use client';

import type { ReactNode } from 'react';
import { AppShell } from '@/components/layouts/AppShell';
import { useAuth } from '@/hooks/useAuth';

/**
 * El inventario verde es público por ahora (docs/inventario-verde/README.md),
 * así que vive fuera de (dashboard) y sin RouteGuard. Quien tiene sesión lo ve
 * igual que el resto del sistema, con el sidebar; quien no, lo ve solo.
 */
export default function InventarioVerdeLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return user ? <AppShell>{children}</AppShell> : <>{children}</>;
}
