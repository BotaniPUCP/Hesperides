'use client';

import Link from 'next/link';
import type { PlacePerspective } from '@shared/types';
import { Badge } from '@/components/ui';
import { cn } from '@/lib/cn';
import { PhotoStrip } from './PhotoStrip';

export interface PerspectiveListProps {
  perspectives: PlacePerspective[];
  focused: number | null;
  onFocus: (id: number) => void;
  onOpenPhoto: (perspective: PlacePerspective, index: number) => void;
}

/** Las perspectivas de un lugar con su nombre estándar, su hito y sus fotos. */
export function PerspectiveList({ perspectives, focused, onFocus, onOpenPhoto }: PerspectiveListProps) {
  if (perspectives.length === 0) {
    return <p className="text-sm text-neutral-500">Este lugar todavía no tiene perspectivas.</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {perspectives.map((v) => (
        <li
          key={v.id}
          className={cn(
            'rounded-lg border p-3 transition-colors',
            focused === v.id ? 'border-amber-500 bg-amber-50/60' : 'border-neutral-200 bg-neutral-0',
          )}
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge label={v.side.label} color={v.side.code === 'SIDE' ? 'neutral' : 'info'} />
              <h3 className="text-sm font-semibold text-neutral-900">{v.displayName}</h3>
            </div>
            <button
              type="button"
              onClick={() => onFocus(v.id)}
              aria-label={`Ver ${v.displayName} en el mapa`}
              className="rounded-md px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-600"
            >
              Ver en el mapa
            </button>
          </div>
          {v.landmark && (
            <p className="mb-2 text-xs text-neutral-600">
              Hacia{' '}
              <Link href={`/lugares/${v.landmark.code}`} className="font-medium text-brand-700 hover:underline">
                {v.landmark.name}
              </Link>
            </p>
          )}
          <PhotoStrip photos={v.photos} subject={v.displayName} onOpen={(i) => onOpenPhoto(v, i)} />
        </li>
      ))}
    </ul>
  );
}
