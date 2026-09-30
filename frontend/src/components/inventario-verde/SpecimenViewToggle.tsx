'use client';

import type { SpecimenViewMode } from '@shared/types';
import { cn } from '@/lib/cn';

export interface SpecimenViewToggleProps {
  viewMode: SpecimenViewMode;
  onViewModeChange: (mode: SpecimenViewMode) => void;
}

export function SpecimenViewToggle({
  viewMode,
  onViewModeChange,
}: SpecimenViewToggleProps) {
  return (
    <div
      className="inline-flex items-center rounded-lg border border-neutral-200 bg-neutral-100 p-0.5"
      role="group"
      aria-label="Modo de visualización de ejemplares"
    >
      <button
        type="button"
        aria-pressed={viewMode === 'cards'}
        onClick={() => onViewModeChange('cards')}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
          viewMode === 'cards'
            ? 'bg-neutral-0 text-neutral-900 shadow-sm font-semibold'
            : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50'
        )}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
        <span className="hidden sm:inline">Cuadrícula</span>
      </button>

      <button
        type="button"
        aria-pressed={viewMode === 'table'}
        onClick={() => onViewModeChange('table')}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
          viewMode === 'table'
            ? 'bg-neutral-0 text-neutral-900 shadow-sm font-semibold'
            : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50'
        )}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6h16M4 10h16M4 14h16M4 18h16"
          />
        </svg>
        <span className="hidden sm:inline">Tabla</span>
      </button>
    </div>
  );
}
