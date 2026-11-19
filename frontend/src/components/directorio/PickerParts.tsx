'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui';

/** Lo ya elegido en un selector del Directorio, con la opción de cambiarlo. */
export function PickedValue({ label, text, detail, onClear }:
  { label: string; text: string; detail?: string; onClear: () => void }) {
  return (
    <div>
      <p className="text-sm font-medium text-neutral-900">{label}</p>
      <div className="mt-1 flex items-center justify-between gap-2 rounded-md border border-neutral-200 px-3 py-2">
        <span className="text-neutral-900">
          {text}
          {detail && <span className="text-sm text-neutral-600"> · {detail}</span>}
        </span>
        <Button size="sm" variant="ghost" onClick={onClear}>Cambiar</Button>
      </div>
    </div>
  );
}

/** Una fila de resultados: elegirla es pulsarla. */
export function PickerOption({ label, detail, onClick, action }:
  { label: string; detail?: string; onClick?: () => void; action?: ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-2">
      {onClick ? (
        <button type="button" onClick={onClick}
          className="flex-1 rounded-md px-2 py-1 text-left text-neutral-900 hover:bg-neutral-50">
          <span>{label}</span>
          {detail && <span aria-hidden="true" className="ml-2 text-sm text-neutral-600">{detail}</span>}
        </button>
      ) : (
        <span className="flex-1 px-2 py-1 text-neutral-900">
          {label}
          {detail && <span className="ml-2 text-sm text-neutral-600">{detail}</span>}
        </span>
      )}
      {action}
    </li>
  );
}

/** La lista bajo el buscador: resultados, o el aviso de que no hay ninguno. */
export function PickerResults({ empty, emptyText, footer, children }:
  { empty: boolean; emptyText: string; footer?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-2 rounded-md border border-neutral-200 p-2">
      {empty ? <p className="px-2 text-sm text-neutral-600">{emptyText}</p> : <ul className="space-y-1">{children}</ul>}
      {footer && <div className="px-2">{footer}</div>}
    </div>
  );
}
