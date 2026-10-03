'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { PlaceDetail } from '@shared/types';
import { Badge, ImagePlaceholder } from '@/components/ui';
import { photoSrcSet } from '@/lib/photo-srcset';

export interface PlaceHeaderProps {
  place: PlaceDetail;
  onOpenMain: (index: number) => void;
  /** Botones de edición, solo para quien puede editar. */
  actions?: ReactNode;
}

/** Foto principal, nombre, padre, categoría, alias y lo que hay dentro del lugar. */
export function PlaceHeader({ place, onOpenMain, actions }: PlaceHeaderProps) {
  const main = place.mainPhotos[0];
  return (
    <section className="grid gap-5 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-0 shadow-xs md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="h-56 bg-neutral-100 md:h-full">
        {main ? (
          <button type="button" onClick={() => onOpenMain(0)} aria-label={`Abrir foto principal de ${place.name}`} className="h-full w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={main.thumbnailUrl} srcSet={photoSrcSet(main.thumbnailUrl)} sizes="(min-width: 768px) 40vw, 100vw" alt="" className="h-full w-full object-cover" />
          </button>
        ) : (
          <ImagePlaceholder label="Sin foto principal" size="full" className="rounded-none border-none" />
        )}
      </div>
      <div className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge label={place.category.label} color="brand" />
          <Badge label={place.kind.label} color="neutral" />
          <span className="font-mono text-xs text-neutral-400">{place.code}</span>
          {actions && <div className="ml-auto flex gap-2">{actions}</div>}
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">{place.name}</h1>
          {place.parent && (
            <p className="text-sm text-neutral-600">
              Dentro de{' '}
              <Link href={`/lugares/${place.parent.code}`} className="font-medium text-brand-700 hover:underline">
                {place.parent.name}
              </Link>
            </p>
          )}
        </div>
        {place.aliases.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">También le dicen</h2>
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {place.aliases.map((a) => (
                <li key={a} className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-700">{a}</li>
              ))}
            </ul>
          </div>
        )}
        {place.children.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Lugares dentro</h2>
            <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm">
              {place.children.map((c) => (
                <li key={c.code}>
                  <Link href={`/lugares/${c.code}`} className="text-brand-700 hover:underline">{c.name}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
