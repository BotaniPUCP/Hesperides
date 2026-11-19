'use client';

import { Button } from '@/components/ui';

export interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onDeactivate: () => void;
  disabled?: boolean;
}

/**
 * Barra contextual integrada para acciones masivas (SPEC-103 / Mejora UX/UI).
 * Se ubica en el flujo de la página encima de la cuadrícula o tabla de ejemplares,
 * evitando flotar sobre el contenido y sin cubrir ninguna tarjeta ni dato del pie.
 */
export function BulkActionsBar({
  selectedCount,
  onClearSelection,
  onDeactivate,
  disabled = false,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      role="region"
      aria-label="Acciones masivas de ejemplares seleccionados"
      className="rounded-xl border border-brand-200/90 bg-brand-50/70 p-3 sm:px-4 sm:py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs mb-4 animate-in fade-in slide-in-from-top-1 duration-150"
    >
      <div className="flex items-center min-w-0">
        <span className="text-xs sm:text-sm font-semibold text-neutral-900 truncate">
          {selectedCount === 1 ? '1 ejemplar seleccionado' : `${selectedCount} ejemplares seleccionados`}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          disabled={disabled}
        >
          <span className="text-neutral-700 hover:text-neutral-950 font-medium text-xs">
            Desmarcar todos
          </span>
        </Button>

        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={onDeactivate}
          disabled={disabled}
          leadingIcon={
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          }
        >
          Dar de baja seleccionados ({selectedCount})
        </Button>
      </div>
    </div>
  );
}
