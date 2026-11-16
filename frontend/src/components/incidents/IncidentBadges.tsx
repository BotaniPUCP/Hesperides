'use client';

import type { Incident } from '@shared/types';
import { Badge, StatusBadge, UrgencyBadge, type UrgencyCode } from '@/components/ui';
import { incidentDate } from '@/lib/incidentNavigation';

const DEADLINE = {
  ON_TIME: { label: 'A tiempo', color: 'success' },
  DUE_SOON: { label: 'Por vencer', color: 'warning' },
  OVERDUE: { label: 'Vencida', color: 'danger' },
} as const;

/** Plazo de atención (SPEC-201 §3.9): el mismo verde, ámbar o rojo que muestra el mapa. */
export function DeadlineBadge({ incident }: { incident: Incident }) {
  const deadline = incident.deadline;
  if (!deadline) return null;
  if (deadline.met !== null) {
    return <Badge label={deadline.met ? 'Cerrada en plazo' : 'Cerrada fuera de plazo'} color={deadline.met ? 'success' : 'danger'} />;
  }
  if (!deadline.status) return null;
  const view = DEADLINE[deadline.status];
  return <span title={`Vence: ${incidentDate(deadline.dueAt)}`}><Badge label={view.label} color={view.color} /></span>;
}

/** Estado, activación, urgencia y plazo, en el orden en que coordinación los lee. */
export function IncidentBadges({ incident }: { incident: Incident }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusBadge code={incident.status.code} label={incident.status.label} />
      {!incident.active && incident.status.code !== 'CLOSED' && <Badge label="Por activar" color="info" />}
      {incident.urgency && <UrgencyBadge code={incident.urgency.code as UrgencyCode} label={incident.urgency.label} />}
      <DeadlineBadge incident={incident} />
    </div>
  );
}
