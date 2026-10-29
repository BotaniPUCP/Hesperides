'use client';

import type { ReactNode } from 'react';
import { EmptyState } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

export interface IncidentAccessProps {
  children: ReactNode;
}

/** The dashboard already handles the session; this guard applies module roles. */
export function IncidentAccess({ children }: IncidentAccessProps) {
  const { user } = useAuth();
  if (!user || !['COORDINADOR', 'SUPERVISOR'].includes(user.role.code)) {
    return <EmptyState title="Sin acceso a incidencias" description="Este módulo está disponible para capataces y coordinación." />;
  }
  return children;
}
