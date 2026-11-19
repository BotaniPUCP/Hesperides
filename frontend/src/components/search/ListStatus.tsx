'use client';

import { Button } from '@/components/ui';

export interface ListStatusProps {
  /** Ya se escribió algo: antes de eso, «Cargando…» sería ruido. */
  typed: boolean;
  loaded: boolean;
  errorMessage: string | null;
  onRetry: () => void;
}

/**
 * Estado de la lista precargada bajo un buscador (SPEC-119 §5.2): cargando la primera vez, o el
 * fallo con «Reintentar». Si falla una recarga, la lista anterior sigue sirviendo, pero se avisa.
 */
export function ListStatus({ typed, loaded, errorMessage, onRetry }: ListStatusProps) {
  if (errorMessage) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-alert-danger-fg">
        <span>{loaded ? 'Puede que no incluya lo último registrado.' : `No se pudo cargar la lista. ${errorMessage}`}</span>
        <Button type="button" size="sm" variant="secondary" onClick={onRetry}>Reintentar</Button>
      </div>
    );
  }
  if (!loaded && typed) return <p role="status" className="text-sm text-neutral-600">Cargando…</p>;
  return null;
}
