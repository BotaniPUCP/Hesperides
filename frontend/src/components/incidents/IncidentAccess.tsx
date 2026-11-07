'use client';

import type { ReactNode } from 'react';
import { EmptyState } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { canUseIncidents } from '@/lib/incidentRoles';

export interface IncidentAccessProps {
  children: ReactNode;
}

/** The dashboard already handles the session; this guard applies module roles. */
export function IncidentAccess({ children }: IncidentAccessProps) {
  const { user } = useAuth();
  if (!canUseIncidents(user?.role.code)) {
    return <EmptyState title="Sin acceso a incidencias" description="Este módulo está disponible para administración, coordinación y capataces." />;
  }
  return children;
}
