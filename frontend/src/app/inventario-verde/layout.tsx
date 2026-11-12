'use client';

import type { ReactNode } from 'react';
import { AppShell } from '@/components/layouts/AppShell';
import { ModuleBackdrop } from '@/components/layouts/ModuleBackdrop';
import { PageFrame } from '@/components/layouts/PageFrame';
import { useAuth } from '@/hooks/useAuth';

/**
 * El inventario verde es público por ahora (docs/inventario-verde/README.md),
 * así que vive fuera de (dashboard) y sin RouteGuard. Quien tiene sesión lo ve
 * igual que el resto del sistema, con el sidebar; quien no, lo ve solo.
 */
export default function InventarioVerdeLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user) return <AppShell>{children}</AppShell>;
  return (
    <main className="relative isolate min-h-screen p-4 md:p-6">
      <ModuleBackdrop />
      <PageFrame>{children}</PageFrame>
    </main>
  );
}
