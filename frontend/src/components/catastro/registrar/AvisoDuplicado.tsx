'use client';

import type { DuplicateMatch } from '@shared/types';
import { Button } from '@/components/ui';

export interface AvisoDuplicadoProps {
  duplicado: DuplicateMatch;
  /** «la misma planta», «el mismo tacho»… */
  queEs: string;
  enviando: boolean;
  onConfirmar: () => void;
  onRevisar: () => void;
}

/** El 409 del registro: hay otro igual muy cerca, y decide quien registra. */
export function AvisoDuplicado({ duplicado, queEs, enviando, onConfirmar, onRevisar }: AvisoDuplicadoProps) {
  return (
    <div role="alertdialog" aria-labelledby="duplicado-titulo" className="rounded-lg border border-urgency-medium-fg bg-urgency-medium-bg p-4">
      <p id="duplicado-titulo" className="font-semibold text-urgency-medium-fg">
        ¿Es {queEs} que {duplicado.duplicateOf}?
      </p>
      <p className="text-sm text-urgency-medium-fg">Hay uno igual a {duplicado.distanceM} m del punto marcado.</p>
      <div className="mt-3 flex gap-3">
        <Button onClick={onConfirmar} loading={enviando}>No, es otro: registrar</Button>
        <Button variant="ghost" onClick={onRevisar}>Revisar el punto</Button>
      </div>
    </div>
  );
}
