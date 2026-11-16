'use client';

import type { IncidentDetail } from '@shared/types';
import { Button, Card } from '@/components/ui';
import { gapsSentence } from '@/lib/incidentLabels';

/** Coordinación activa al final de la revisión; antes, la incidencia no se atiende (SPEC-201 §3.6). */
export function IncidentActivationCard({ detail, busy, onActivate }: {
  detail: IncidentDetail; busy: boolean; onActivate: () => void;
}) {
  const gaps = detail.activationGaps;
  return <Card title="Activación">
    <div className="space-y-3 text-sm">
      <p>Revisa y corrige lo necesario. Al activarla, la incidencia se puede atender y aparece en el mapa.</p>
      {gaps.length > 0 && <p className="font-medium text-alert-warning-fg">{gapsSentence(gaps)}</p>}
      <Button type="button" size="lg" disabled={busy || gaps.length > 0} onClick={onActivate}>Activar incidencia</Button>
    </div>
  </Card>;
}
