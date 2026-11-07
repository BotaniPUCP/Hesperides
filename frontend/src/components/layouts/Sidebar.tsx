'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { HOME_ITEM, activeHref, visibleDirectLinks, visibleNavigation } from '@/lib/navigation';
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
  const activo = activeHref(pathname, [
    HOME_ITEM.href,
    ...enlaces.map((enlace) => enlace.href),
    ...grupos.flatMap((grupo) => grupo.items.map((item) => item.href)),
  ]);

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
          active={activo === HOME_ITEM.href}
          onNavigate={onNavigate}
        />
        {enlaces.map((enlace) => (
          <SidebarLink
            key={enlace.href}
            href={enlace.href}
            label={enlace.label}
            icon={enlace.icon}
            active={activo === enlace.href}
            onNavigate={onNavigate}
          />
        ))}
        {grupos.map((grupo) =>
          grupo.items.length === 1 ? (
            <SidebarLink
              key={grupo.id}
              href={grupo.items[0].href}
              label={grupo.items[0].label}
              icon={grupo.items[0].icon}
              active={activo === grupo.items[0].href}
              onNavigate={onNavigate}
            />
          ) : (
            <SidebarGroup key={grupo.id} group={grupo} activeHref={activo} onNavigate={onNavigate} />
          ),
        )}
      </nav>

      <SidebarUserPanel />
    </div>
  );
}
