'use client';

import Link from 'next/link';
import { cn } from '@/lib/cn';

export interface SidebarLinkProps {
  href: string;
  label: string;
  icon: string;
  active: boolean;
  nested?: boolean;
  onNavigate?: () => void;
}

/**
 * La página activa se anuncia con `aria-current="page"`, no solo con color:
 * un lector de pantalla no ve el fondo verde. El color es `brand-50`, el que
 * SPEC-C01 reserva para los estados activos de navegación.
 */
export function SidebarLink({ href, label, icon, active, nested = false, onNavigate }: SidebarLinkProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600',
        nested && 'pl-9',
        active
          ? 'bg-brand-50 font-semibold text-brand-700'
          : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900',
      )}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
