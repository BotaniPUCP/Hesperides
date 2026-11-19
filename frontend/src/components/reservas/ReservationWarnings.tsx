'use client';

import type { ReservationWarning } from '@shared/types';

interface Props {
  warnings: readonly ReservationWarning[];
  /** Un título sobre el bloque, cuando la pantalla necesita explicar qué son. */
  title?: string;
  /** En el registro de intervención se muestran como mucho 20 (SPEC-107 §5.3). */
  maxVisible?: number;
}

function Item({ warning }: { warning: ReservationWarning }) {
  return <li>{warning.text}</li>;
}

/**
 * Los avisos de reservas (SPEC-107 §7): nunca bloquean, por eso son `status` y no
 * `alert`. Los críticos van primero y en los colores de peligro; el resto, en el
 * ámbar de SPEC-203. El texto ya viene armado por el backend.
 */
export function ReservationWarnings({ warnings, title, maxVisible }: Props) {
  if (warnings.length === 0) return null;

  const shown = maxVisible === undefined ? warnings : warnings.slice(0, maxVisible);
  const hidden = warnings.length - shown.length;
  const critical = shown.filter((w) => w.severity === 'CRITICAL');
  const normal = shown.filter((w) => w.severity !== 'CRITICAL');

  return (
    <div role="status" className="space-y-2 text-sm">
      {title && <p className="font-medium text-neutral-900">{title}</p>}
      {critical.length > 0 && (
        <div className="rounded-md border border-alert-danger-border bg-alert-danger-bg p-3 text-alert-danger-fg">
          <p className="font-semibold">Atención</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {critical.map((warning, index) => <Item key={`${warning.kind}-${index}`} warning={warning} />)}
          </ul>
        </div>
      )}
      {normal.length > 0 && (
        <div className="rounded-md border border-alert-warning-border bg-alert-warning-bg p-3 text-alert-warning-fg">
          <ul className="list-disc space-y-1 pl-5">
            {normal.map((warning, index) => <Item key={`${warning.kind}-${index}`} warning={warning} />)}
          </ul>
        </div>
      )}
      {hidden > 0 && (
        <p className="text-neutral-600">y {hidden} {hidden === 1 ? 'aviso más' : 'avisos más'}</p>
      )}
    </div>
  );
}
