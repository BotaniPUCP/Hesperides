'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { PlaceSummary } from '@shared/types';
import { Badge, Card, ImagePlaceholder } from '@/components/ui';
import { photoSrcSet } from '@/lib/photo-srcset';

/**
 * A un exterior le faltan fotos si no tiene foto principal, frente o espalda:
 * es lo que el equipo de levantamiento necesita ver para saber a dónde ir.
 */
export function missingPhotos(p: PlaceSummary): boolean {
  return p.kind.code === 'OUTDOOR' && (!p.mainPhotoUrl || !p.hasFront || !p.hasBack);
}

const plural = (n: number) => `${n} ${n === 1 ? 'perspectiva' : 'perspectivas'}`;

export function PlaceCard({ place }: { place: PlaceSummary }) {
  const [broken, setBroken] = useState(false);
  const photo = place.mainPhotoUrl && !broken ? place.mainPhotoUrl : null;

  return (
    <Link
      href={`/lugares/${place.code}`}
      className="group block h-full rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
    >
      <Card
        padded={false}
        className="flex h-full flex-col overflow-hidden border-neutral-200 transition-all group-hover:border-brand-600 group-hover:shadow-md"
      >
        <div className="relative h-40 w-full flex-shrink-0 overflow-hidden bg-neutral-100">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} srcSet={photoSrcSet(photo)} sizes="(min-width: 640px) 25vw, 100vw" alt="" loading="lazy" onError={() => setBroken(true)} className="h-full w-full object-cover" />
          ) : (
            <ImagePlaceholder label={place.name} size="full" className="rounded-none border-none" />
          )}
          <div className="absolute right-2 top-2">
            <Badge label={place.category.label} color="brand" />
          </div>
          {missingPhotos(place) && (
            <span className="absolute bottom-2 left-2 rounded bg-amber-500/95 px-2 py-0.5 text-[11px] font-semibold text-neutral-900">
              Faltan fotos
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col justify-between gap-2 p-4">
          <div>
            <h3 className="line-clamp-1 text-base font-bold text-neutral-900 group-hover:text-brand-700">{place.name}</h3>
            {place.parent && <p className="line-clamp-1 text-xs text-neutral-500">{place.parent.name}</p>}
          </div>
          <div className="flex items-center justify-between border-t border-neutral-100 pt-2 text-xs text-neutral-600">
            <span>{place.kind.code === 'OUTDOOR' ? plural(place.perspectiveCount) : 'Interior'}</span>
            <span className="font-mono text-neutral-400">{place.code}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
