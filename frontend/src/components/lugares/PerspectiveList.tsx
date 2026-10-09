'use client';

import type { ReactNode } from 'react';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { PlacePerspective, PlacePhoto } from '@shared/types';
import { cardClass } from './perspectives/cardClass';
import { PerspectiveCardBody } from './perspectives/PerspectiveCardBody';
import { SortablePerspective } from './perspectives/SortablePerspective';

export interface PerspectiveListProps {
  perspectives: PlacePerspective[];
  focused: number | null;
  onFocus: (id: number) => void;
  onOpenPhoto: (perspective: PlacePerspective, index: number) => void;
  /** Solo para quien edita: botones, subida de fotos y arrastre para ordenar. */
  editing?: {
    onEdit: (v: PlacePerspective) => void;
    onDelete: (v: PlacePerspective) => void;
    onDeletePhoto: (photo: PlacePhoto) => void;
    uploader: (v: PlacePerspective) => ReactNode;
    onMove: (activeId: number, overId: number) => void;
  };
}

/** Un arrastre de menos píxeles es un clic: los botones de la tarjeta siguen funcionando. */
const DRAG_START_PX = 6;

/**
 * Las perspectivas de un lugar en su orden. Quien edita las reordena
 * arrastrándolas del asa (con ratón, dedo o teclado: espacio para tomar,
 * flechas para mover); las demás se apartan con animación.
 */
export function PerspectiveList({ perspectives, focused, onFocus, onOpenPhoto, editing }: PerspectiveListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: DRAG_START_PX } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (perspectives.length === 0) {
    return <p className="text-sm text-neutral-500">Este lugar todavía no tiene perspectivas.</p>;
  }

  const body = (v: PlacePerspective) => (
    <PerspectiveCardBody perspective={v} onFocus={onFocus} onOpenPhoto={onOpenPhoto} editing={editing} />
  );

  if (!editing) {
    return (
      <ul className="flex flex-col gap-3">
        {perspectives.map((v) => <li key={v.id} className={cardClass(focused === v.id)}>{body(v)}</li>)}
      </ul>
    );
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) editing.onMove(Number(active.id), Number(over.id));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={perspectives.map((v) => v.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-3">
          {perspectives.map((v) => (
            <SortablePerspective key={v.id} perspective={v} focused={focused === v.id}>{body(v)}</SortablePerspective>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
