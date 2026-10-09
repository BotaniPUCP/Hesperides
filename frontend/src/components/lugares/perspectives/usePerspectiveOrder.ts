'use client';

import { useState } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import type { PlacePerspective } from '@shared/types';
import { useToast } from '@/components/ui';
import { mensajeDeApiError } from '@/lib/api-errors';
import { placesApi } from '@/lib/places-api';

/** Las mismas perspectivas (aunque en otro orden): si no, el orden local quedó viejo. */
const sameSet = (ids: number[], perspectives: PlacePerspective[]) =>
  ids.length === perspectives.length && perspectives.every((p) => ids.includes(p.id));

/**
 * El orden de las perspectivas de un lugar. Al soltar una tarjeta el orden cambia
 * en pantalla de inmediato y se guarda detrás; si el guardado falla, vuelve al
 * de antes y avisa.
 */
export function usePerspectiveOrder(placeCode: string, perspectives: PlacePerspective[]) {
  const { showToast } = useToast();
  const [ids, setIds] = useState<number[] | null>(null);
  const current = ids && sameSet(ids, perspectives) ? ids : perspectives.map((p) => p.id);
  const byId = new Map(perspectives.map((p) => [p.id, p]));
  const ordered = current.map((id) => byId.get(id) as PlacePerspective);

  function move(activeId: number, overId: number) {
    const from = current.indexOf(activeId), to = current.indexOf(overId);
    if (from < 0 || to < 0 || from === to) return;
    const before = current;
    const next = arrayMove(current, from, to);
    setIds(next);
    placesApi.reorderPerspectives(placeCode, next).catch((e: unknown) => {
      setIds(before);
      showToast({ variant: 'error', title: 'No se pudo guardar el orden', description: mensajeDeApiError(e) });
    });
  }

  return { ordered, move };
}
