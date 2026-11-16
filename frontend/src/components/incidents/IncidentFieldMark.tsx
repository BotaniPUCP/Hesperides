'use client';

import type { ReactNode } from 'react';
import type { Incident, IncidentSuggestion } from '@shared/types';

/** Campo de la revisión cuyo valor puede venir del agente (SPEC-201 §2.7, marcas IA / Editado). */
export type MarkedField = 'title' | 'typeCode' | 'zoneId' | 'reference' | 'heightClass';

const CURRENT: Record<MarkedField, (i: Incident) => unknown> = {
  title: (i) => i.title,
  typeCode: (i) => i.type?.code ?? null,
  zoneId: (i) => i.zone?.id ?? null,
  reference: (i) => i.locationReference,
  heightClass: (i) => i.heightClass,
};

function mark(field: MarkedField, incident: Incident, suggestion: IncidentSuggestion | null): 'ai' | 'edited' | null {
  if (incident.editedFields.includes(field)) return 'edited';
  const suggested = suggestion?.[field];
  const current = CURRENT[field](incident);
  return suggested !== undefined && suggested !== null && suggested === current ? 'ai' : null;
}

export function MarkedField({ field, incident, suggestion, children }: {
  field: MarkedField; incident: Incident; suggestion: IncidentSuggestion | null; children: ReactNode;
}) {
  const kind = mark(field, incident, suggestion);
  return (
    <div data-testid={`field-${field}`} className="space-y-1">
      {children}
      {kind === 'ai' && <p className="text-xs font-medium text-brand-700">Sugerido por IA</p>}
      {kind === 'edited' && <p className="text-xs font-medium text-neutral-700">Editado</p>}
    </div>
  );
}
