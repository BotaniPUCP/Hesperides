'use client';

import type { IncidentDetail, IncidentOptions } from '@shared/types';
import { Button, Card } from '@/components/ui';
import { PREFILL_WARNINGS } from '@/lib/incidentLabels';

/** Lo que propuso el agente, para que coordinación lo valide (SPEC-201 §3.4). Nunca decide solo. */
export function IncidentPrefillCard({ detail, options, busy, onRetry }: {
  detail: IncidentDetail; options: IncidentOptions | null; busy: boolean; onRetry: () => void;
}) {
  const { prefill, capabilities } = detail;
  const urgency = options?.urgencies.find((u) => u.code === prefill.suggestedUrgencyCode)?.label ?? prefill.suggestedUrgencyCode;
  return <Card title="Prellenado por IA">
    <div className="space-y-3 text-sm">
      {prefill.status === 'PENDING' && <p role="status">La IA está preparando una sugerencia. El reporte ya está guardado.</p>}
      {prefill.status === 'FAILED' && <p>No se pudo obtener la sugerencia. Puedes completar los datos a mano o reintentar.</p>}
      {prefill.status === 'NOT_REQUESTED' && <p>Este reporte no tiene sugerencia de la IA.</p>}
      {prefill.status === 'READY' && <>
        {prefill.suggestedUrgencyCode && <p className="rounded-md bg-alert-warning-bg p-3 text-alert-warning-fg">
          La IA sugiere urgencia {urgency}{prefill.suggestion?.imminentReason ? `: ${prefill.suggestion.imminentReason}` : ''}.
          La gravedad que marcó quien reportó no se cambia sola.</p>}
        {prefill.suggestsThirdParty && <p>La IA sugiere que la atienda un tercero.</p>}
        {prefill.warnings.map((w) => <p key={w} className="font-medium text-alert-warning-fg">{PREFILL_WARNINGS[w]}</p>)}
        {prefill.suggestion?.plan && <details><summary className="cursor-pointer text-brand-700">Plan sugerido</summary>
          <p className="mt-2 whitespace-pre-wrap">{prefill.suggestion.plan}</p></details>}
        {prefill.suggestion?.justification && <p className="text-neutral-700">Por qué: {prefill.suggestion.justification}</p>}
      </>}
      {capabilities.canRetryPrefill && <Button type="button" variant="secondary" size="lg" disabled={busy} onClick={onRetry}>
        Pedir otra sugerencia</Button>}
    </div>
  </Card>;
}
