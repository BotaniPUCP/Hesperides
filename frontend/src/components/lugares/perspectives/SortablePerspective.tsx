'use client';

import type { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PlacePerspective } from '@shared/types';
import { cn } from '@/lib/cn';
import { cardClass } from './cardClass';

export interface SortablePerspectiveProps {
  perspective: PlacePerspective;
  focused: boolean;
  children: ReactNode;
}

/**
 * Una tarjeta que se arrastra desde su asa (⋮⋮), no desde toda la tarjeta: así
 * no compite con los clics en fotos y botones.
 */
export function SortablePerspective({ perspective, focused, children }: SortablePerspectiveProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: perspective.id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(cardClass(focused), 'flex gap-2', isDragging && 'relative z-10 shadow-lg ring-2 ring-brand-600')}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Mover ${perspective.displayName}`}
        className="-ml-1 flex w-6 flex-shrink-0 cursor-grab touch-none items-start justify-center rounded pt-1 text-neutral-400 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-600 active:cursor-grabbing"
      >
        <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden="true">
          <circle cx="7" cy="5" r="1.5" /><circle cx="13" cy="5" r="1.5" />
          <circle cx="7" cy="10" r="1.5" /><circle cx="13" cy="10" r="1.5" />
          <circle cx="7" cy="15" r="1.5" /><circle cx="13" cy="15" r="1.5" />
        </svg>
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}
