'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { HOME_ITEM, isActivePath, visibleDirectLinks, visibleNavigation } from '@/lib/navigation';
import { SidebarGroup } from './SidebarGroup';
import { SidebarLink } from './SidebarLink';
import { SidebarUserPanel } from './SidebarUserPanel';

export interface SidebarProps {
  /** Lo usa el panel móvil para cerrarse al elegir una página. */
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const rol = user?.role.code ?? '';
  const enlaces = visibleDirectLinks(rol);
  const grupos = visibleNavigation(rol);

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
        {enlaces.map((enlace) => (
          <SidebarLink
            key={enlace.href}
            href={enlace.href}
            label={enlace.label}
            icon={enlace.icon}
            active={isActivePath(pathname, enlace.href)}
            onNavigate={onNavigate}
          />
        ))}
        {grupos.map((grupo) => (
          <SidebarGroup key={grupo.id} group={grupo} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </nav>

      <SidebarUserPanel />
    </div>
  );
}
