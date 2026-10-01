'use client';

import { useId, useState } from 'react';
import { cn } from '@/lib/cn';
import { isActivePath, type NavGroup } from '@/lib/navigation';
import { SidebarLink } from './SidebarLink';

export interface SidebarGroupProps {
  group: NavGroup;
  pathname: string;
  onNavigate?: () => void;
}

/**
 * Módulo desplegable. Arranca abierto solo si contiene la página activa: quien
 * entra a /admin/catalogos ve dónde está sin tener que abrir nada, y el resto
 * de módulos no ocupa espacio mientras no se usan.
 */
export function SidebarGroup({ group, pathname, onNavigate }: SidebarGroupProps) {
  const contieneActiva = group.items.some((item) => isActivePath(pathname, item.href));
  const [abierto, setAbierto] = useState(contieneActiva);
  const idLista = useId();

  return (
    <div>
      <button
        type="button"
        aria-expanded={abierto}
        aria-controls={idLista}
        onClick={() => setAbierto((valor) => !valor)}
        className={cn(
          'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600',
          contieneActiva ? 'text-brand-700' : 'text-neutral-900 hover:bg-neutral-100',
        )}
      >
        <span aria-hidden="true">{group.icon}</span>
        <span className="flex-1 text-left">{group.label}</span>
        <span aria-hidden="true" className={cn('text-xs transition-transform', abierto && 'rotate-90')}>
          ▸
        </span>
      </button>

      {abierto && (
        <ul id={idLista} className="mt-1 space-y-1">
          {group.items.map((item) => (
            <li key={item.href}>
              <SidebarLink
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isActivePath(pathname, item.href)}
                nested
                onNavigate={onNavigate}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
