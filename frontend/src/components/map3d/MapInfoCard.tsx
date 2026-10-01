'use client';

import type { InfoCard } from './infoCard';

export type MapCardContent =
  | { kind: 'element'; card: InfoCard }
  | { kind: 'location'; lat: number; lon: number; text: string | null; error: string | null };

export interface MapInfoCardProps {
  content: MapCardContent;
  onClose: () => void;
}

const coords = (lat: number, lon: number) => `${lat.toFixed(6)}, ${lon.toFixed(6)}`;

/** Ficha del elemento elegido, o la descripción del punto pulsado en el suelo. */
export function MapInfoCard({ content, onClose }: MapInfoCardProps) {
  const title = content.kind === 'element' ? content.card.title : 'Punto seleccionado';
  const kind = content.kind === 'element' ? content.card.kind : 'Ubicación';
  return (
    <section aria-label={title} className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white/95 p-3 text-sm shadow-lg">
      <header className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{kind}</p>
          <h2 className="font-semibold text-neutral-900">{title}</h2>
        </div>
        <button type="button" aria-label="Cerrar ficha" onClick={onClose} className="rounded px-1 text-neutral-500 hover:bg-neutral-100">
          ✕
        </button>
      </header>
      {content.kind === 'element' ? (
        <>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            {content.card.rows.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-neutral-500">{label}</dt>
                <dd className="text-neutral-800">{value}</dd>
              </div>
            ))}
          </dl>
          {content.card.note && <p className="mt-2 text-xs text-neutral-500">{content.card.note}</p>}
        </>
      ) : (
        <div className="space-y-1 text-xs">
          <p className="text-neutral-800">{content.error ?? content.text ?? 'Calculando ubicación…'}</p>
          <p className="text-neutral-500">{coords(content.lat, content.lon)}</p>
        </div>
      )}
    </section>
  );
}
