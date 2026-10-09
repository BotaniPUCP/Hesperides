'use client';

import { useState, type ReactNode } from 'react';
import type { PlacePerspective, PlacePhoto } from '@shared/types';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { PerspectiveList } from '../PerspectiveList';
import { PerspectiveCarousel } from './PerspectiveCarousel';
import { usePerspectiveOrder } from './usePerspectiveOrder';

type View = 'list' | 'carousel';

/** Recordada por navegador: es una preferencia de quien mira, no del lugar. */
const VIEW_KEY = 'hesperides.lugares.vistaPerspectivas';

function readView(): View {
  try {
    return window.localStorage.getItem(VIEW_KEY) === 'carousel' ? 'carousel' : 'list';
  } catch {
    return 'list';
  }
}

function saveView(view: View) {
  try {
    window.localStorage.setItem(VIEW_KEY, view);
  } catch {
    // Sin almacenamiento (modo privado): la vista elegida vale solo para esta visita.
  }
}

export interface PerspectivesSectionProps {
  placeCode: string;
  perspectives: PlacePerspective[];
  focused: number | null;
  onFocus: (id: number) => void;
  onOpenPhoto: (perspective: PlacePerspective, index: number) => void;
  onAdd?: () => void;
  editing?: {
    onEdit: (v: PlacePerspective) => void;
    onDelete: (v: PlacePerspective) => void;
    onDeletePhoto: (photo: PlacePhoto) => void;
    uploader: (v: PlacePerspective) => ReactNode;
  };
}

/**
 * Las perspectivas como lista (para editar y ordenar) o como carrusel (para
 * reconocer el sitio). En el carrusel, pasar de diapositiva lleva el mapa a esa
 * perspectiva.
 */
export function PerspectivesSection({ placeCode, perspectives, focused, onFocus, onOpenPhoto, onAdd, editing }: PerspectivesSectionProps) {
  const [view, setView] = useState<View>(readView);
  const [slide, setSlide] = useState(0);
  const { ordered, move } = usePerspectiveOrder(placeCode, perspectives);
  const current = Math.min(slide, Math.max(ordered.length - 1, 0));

  function choose(next: View) {
    setView(next);
    saveView(next);
    if (next === 'carousel' && ordered[current]) onFocus(ordered[current].id);
  }

  function showSlide(i: number) {
    setSlide(i);
    if (ordered[i]) onFocus(ordered[i].id);
  }

  const toggle = (value: View, label: string) => (
    <button type="button" aria-pressed={view === value} onClick={() => choose(value)}
      className={cn('px-3 py-1 text-xs', view === value ? 'bg-brand-50 font-semibold text-brand-800' : 'text-neutral-700 hover:bg-neutral-50')}>
      {label}
    </button>
  );

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-neutral-900">Perspectivas</h2>
        <div className="flex items-center gap-2">
          {ordered.length > 0 && (
            <div role="group" aria-label="Ver perspectivas como" className="flex overflow-hidden rounded-md border border-neutral-200">
              {toggle('list', 'Lista')}
              {toggle('carousel', 'Carrusel')}
            </div>
          )}
          {onAdd && <Button size="sm" onClick={onAdd}>Agregar perspectiva</Button>}
        </div>
      </div>
      {view === 'carousel' && ordered.length > 0 ? (
        <PerspectiveCarousel perspectives={ordered} index={current} onIndexChange={showSlide} onOpenPhoto={onOpenPhoto} />
      ) : (
        <PerspectiveList perspectives={ordered} focused={focused} onFocus={onFocus} onOpenPhoto={onOpenPhoto}
          editing={editing ? { ...editing, onMove: move } : undefined} />
      )}
    </section>
  );
}
