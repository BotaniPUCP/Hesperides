'use client';

import Link from 'next/link';
import type { Balloon } from '@shared/types';
import { balloonName } from './balloonClusters';

export interface BalloonCardProps {
  balloon: Balloon;
  /** El globo dejó de existir en el último refresco: se avisa, no se cierra solo. */
  gone: boolean;
  onClose: () => void;
}

/** La ficha corta de un globo (SPEC-113 §7.2), con el mismo marco que la ficha del mapa. */
export function BalloonCard({ balloon, gone, onClose }: BalloonCardProps) {
  const { card } = balloon;
  return (
    <section aria-label={card.title} className="w-full max-w-sm rounded-lg border border-neutral-200 bg-neutral-0/95 p-3 text-sm shadow-lg">
      <header className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{balloonName(balloon)}</p>
          <h2 className="font-semibold text-neutral-900">{card.title}</h2>
          <p className="text-xs text-neutral-700">{card.status}</p>
        </div>
        <button type="button" aria-label="Cerrar ficha" onClick={onClose} className="rounded px-1 text-neutral-500 hover:bg-neutral-100">
          ✕
        </button>
      </header>
      {gone && (
        <p role="status" className="mb-2 rounded-md bg-alert-info-bg px-2 py-1 text-xs text-alert-info-fg">
          Esto ya terminó: el globo salió del mapa.
        </p>
      )}
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        {card.lines.map((line) => (
          <div key={line.label} className="contents">
            <dt className="text-neutral-500">{line.label}</dt>
            <dd className="text-neutral-800">{line.value}</dd>
          </div>
        ))}
      </dl>
      {card.progress && <Progress done={card.progress.done} total={card.progress.total} />}
      <Link href={card.href} className="mt-2 inline-block text-xs font-medium text-brand-700 hover:underline">
        Ver detalle →
      </Link>
    </section>
  );
}

function Progress({ done, total }: { done: number; total: number }) {
  const label = `${done} de ${total}`;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="mt-2 flex items-center gap-2 text-xs text-neutral-700">
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}
        className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-200">
        <div className="h-full bg-brand-600" style={{ width: `${percent}%` }} />
      </div>
      <span>{label}</span>
    </div>
  );
}
