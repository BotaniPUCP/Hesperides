'use client';

import { useRef } from 'react';
import Link from 'next/link';
import type { PlacePerspective } from '@shared/types';
import { Badge, ImagePlaceholder } from '@/components/ui';
import { cn } from '@/lib/cn';
import { photoSrcSet } from '@/lib/photo-srcset';
import { PhotoStrip } from '../PhotoStrip';

/** Un deslizamiento más corto que esto es un toque, no un cambio de diapositiva. */
const SWIPE_MIN_PX = 50;

export interface PerspectiveCarouselProps {
  perspectives: PlacePerspective[];
  index: number;
  onIndexChange: (index: number) => void;
  onOpenPhoto: (perspective: PlacePerspective, index: number) => void;
}

const ARROW = 'rounded-full bg-neutral-0/95 p-2 text-neutral-800 shadow hover:bg-neutral-0 disabled:opacity-30 focus:outline-none focus:ring-2 focus:ring-brand-600';

/** Una perspectiva a la vez, con su foto en grande: para reconocer el sitio, no para editarlo. */
export function PerspectiveCarousel({ perspectives, index, onIndexChange, onOpenPhoto }: PerspectiveCarouselProps) {
  const touchX = useRef<number | null>(null);
  const last = perspectives.length - 1;
  const go = (i: number) => onIndexChange(Math.max(0, Math.min(last, i)));

  return (
    <section
      aria-roledescription="carrusel"
      aria-label="Perspectivas"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') go(index - 1);
        else if (e.key === 'ArrowRight') go(index + 1);
      }}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) >= SWIPE_MIN_PX) go(index + (dx < 0 ? 1 : -1));
      }}
      className="relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
    >
      <div className="flex transition-transform duration-300 ease-out motion-reduce:transition-none" style={{ transform: `translateX(-${index * 100}%)` }}>
        {perspectives.map((v, i) => (
          <div key={v.id} role="group" aria-roledescription="diapositiva" aria-label={`${i + 1} de ${perspectives.length}: ${v.displayName}`}
            aria-hidden={i !== index} inert={i !== index} className="w-full flex-shrink-0">
            <div className="h-64 bg-neutral-100 sm:h-80">
              {v.photos[0] ? (
                <button type="button" onClick={() => onOpenPhoto(v, 0)} aria-label={`Abrir foto 1 de ${v.displayName}`} className="h-full w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={v.photos[0].thumbnailUrl} srcSet={photoSrcSet(v.photos[0].thumbnailUrl)} sizes="(min-width: 1024px) 50vw, 100vw" alt="" className="h-full w-full object-cover" />
                </button>
              ) : (
                <ImagePlaceholder label="Sin fotos todavía" size="full" className="rounded-none border-none" />
              )}
            </div>
            <div className="flex flex-col gap-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge label={v.side.label} color={v.side.code === 'SIDE' ? 'neutral' : 'info'} />
                <h3 className="text-base font-semibold text-neutral-900">{v.displayName}</h3>
              </div>
              {v.landmark && (
                <p className="text-xs text-neutral-600">
                  Hacia <Link href={`/lugares/${v.landmark.code}`} className="font-medium text-brand-700 hover:underline">{v.landmark.name}</Link>
                </p>
              )}
              {v.photos.length > 1 && <PhotoStrip photos={v.photos} subject={v.displayName} onOpen={(p) => onOpenPhoto(v, p)} />}
            </div>
          </div>
        ))}
      </div>
      <div className="absolute inset-x-3 top-28 flex justify-between sm:top-36">
        <button type="button" aria-label="Perspectiva anterior" disabled={index === 0} onClick={() => go(index - 1)} className={ARROW}>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button type="button" aria-label="Perspectiva siguiente" disabled={index === last} onClick={() => go(index + 1)} className={ARROW}>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      <p className={cn('absolute right-3 top-3 rounded-full bg-neutral-900/70 px-2.5 py-0.5 text-xs font-semibold text-neutral-0')} aria-live="polite">
        {`${index + 1} / ${perspectives.length}`}
      </p>
    </section>
  );
}
