'use client';

import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { HOME_ITEM, isActivePath, visibleNavigation } from '@/lib/navigation';
import { SidebarGroup } from './SidebarGroup';
import { SidebarLink } from './SidebarLink';

export interface SidebarProps {
  /** Lo usa el panel móvil para cerrarse al elegir una página. */
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const grupos = visibleNavigation(user?.role.code ?? '');

  return (
    <div className="flex h-full flex-col bg-neutral-0">
      <div className="border-b border-neutral-100 px-4 py-4">
        <span className="text-lg font-bold tracking-tight text-brand-700">Hesperides</span>
      </div>

      <nav aria-label="Principal" className="flex-1 space-y-1 overflow-y-auto p-3">
        <SidebarLink
          href={HOME_ITEM.href}
          label={HOME_ITEM.label}
          icon={HOME_ITEM.icon}
          active={isActivePath(pathname, HOME_ITEM.href)}
          onNavigate={onNavigate}
        />
        {grupos.map((grupo) => (
          <SidebarGroup key={grupo.id} group={grupo} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="border-t border-neutral-100 p-4">
        <p className="truncate text-sm font-medium text-neutral-900">{user?.fullName}</p>
        <p className="mb-3 truncate text-xs text-neutral-500">{user?.role.label}</p>
        <Button variant="secondary" size="sm" fullWidth onClick={logout}>
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
