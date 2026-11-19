'use client';

import type { ReactNode } from 'react';

export interface SimilarItem {
  code: string;
  title: string;
  detail?: string;
}

interface SimilarListProps {
  items: SimilarItem[];
  /** Qué hacer con un parecido: elegirlo en un formulario o abrirlo en el Directorio. */
  renderAction: (item: SimilarItem) => ReactNode;
}

/** «Antes de crear se muestran los parecidos» (SPEC-106 §2.5): avisa, no bloquea. */
export function SimilarList({ items, renderAction }: SimilarListProps) {
  if (items.length === 0) return null;
  return (
    <div role="status" className="rounded-md border border-alert-warning-border bg-alert-warning-bg p-3 text-sm">
      <p className="font-medium text-alert-warning-fg">¿Ya está registrado? Se parece a:</p>
      <ul className="mt-2 space-y-1">
        {items.map((item) => (
          <li key={item.code} className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-neutral-900">
              {item.title}
              {item.detail && <span className="text-neutral-600"> · {item.detail}</span>}
            </span>
            {renderAction(item)}
          </li>
        ))}
      </ul>
    </div>
  );
}
