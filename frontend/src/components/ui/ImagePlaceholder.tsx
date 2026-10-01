import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface ImagePlaceholderProps {
  type?: string;
  size?: 'sm' | 'md' | 'lg' | 'full';
  label?: string;
  className?: string;
}

function getIconForType(type?: string): ReactNode {
  const normalized = type?.toUpperCase() ?? '';

  if (normalized.includes('PALM')) {
    // Icono de Palmera
    return (
      <svg
        className="w-1/3 h-1/3 max-w-16 max-h-16 text-primary-600/70"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 21v-9" />
        <path d="M12 12c-2-3-6-4-9-4 4-2 7 0 9 4Z" />
        <path d="M12 12c2-3 6-4 9-4-4-2-7 0-9 4Z" />
        <path d="M12 12c-1.5-4-1-8 2-10-1 3-1 6-2 10Z" />
        <path d="M12 12c1.5-4 1-8-2-10 1 3 1 6 2 10Z" />
      </svg>
    );
  }

  if (normalized.includes('SHRUB') || normalized.includes('ARBU')) {
    // Icono de Arbusto / Flor
    return (
      <svg
        className="w-1/3 h-1/3 max-w-16 max-h-16 text-primary-600/70"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 20v-8" />
        <circle cx="12" cy="7" r="3" />
        <path d="M9 14a4 4 0 0 1 6 0" />
        <path d="M6 18a6 6 0 0 1 12 0" />
      </svg>
    );
  }

  // Árbol genérico (por defecto)
  return (
    <svg
      className="w-1/3 h-1/3 max-w-16 max-h-16 text-primary-600/70"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22v-6" />
      <path d="M7 16l5-12 5 12" />
      <path d="M9 13h6" />
      <path d="M6 19c-2 0-3-1-3-3a4 4 0 0 1 4-4c.5-2 2.5-4 5-4s4.5 2 5 4a4 4 0 0 1 4 4c0 2-1 3-3 3H6Z" />
    </svg>
  );
}

export function ImagePlaceholder({
  type,
  size = 'md',
  label = 'Fotografía no disponible',
  className,
}: ImagePlaceholderProps) {
  const sizeClasses = {
    sm: 'h-16 w-16 text-xs',
    md: 'h-36 w-full text-xs',
    lg: 'h-64 w-full text-sm',
    full: 'h-full w-full text-sm',
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center bg-gradient-to-br from-neutral-100 via-neutral-100 to-primary-50/40 p-4 text-neutral-400 select-none border border-neutral-200/60 rounded-md',
        sizeClasses[size],
        className
      )}
      role="img"
      aria-label={label}
    >
      {getIconForType(type)}
      {size !== 'sm' && <span className="mt-2 text-center text-xs font-medium text-neutral-500">{label}</span>}
    </div>
  );
}
