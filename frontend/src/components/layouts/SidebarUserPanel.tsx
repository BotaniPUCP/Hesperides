'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { ThemeSelector } from '@/components/theme';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/cn';

const PREFERENCES_PANEL_ID = 'sidebar-preferencias';

/**
 * Pie del sidebar: quién tiene la sesión, sus preferencias tras el engrane y
 * el cierre de sesión. Las preferencias se despliegan en el sitio, no en un
 * popover, para que funcionen igual dentro del panel móvil.
 */
export function SidebarUserPanel() {
  const { user, logout } = useAuth();
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  return (
    <div className="border-t border-neutral-100 p-4">
      <div className="mb-3 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-neutral-900">{user?.fullName}</p>
          <p className="truncate text-xs text-neutral-500">{user?.role.label}</p>
        </div>
        <button
          type="button"
          aria-label="Preferencias"
          aria-expanded={preferencesOpen}
          aria-controls={PREFERENCES_PANEL_ID}
          onClick={() => setPreferencesOpen((open) => !open)}
          className={cn(
            'rounded-md p-1.5 text-base leading-none transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600',
            preferencesOpen ? 'bg-neutral-100' : 'hover:bg-neutral-100',
          )}
        >
          <span aria-hidden="true">⚙️</span>
        </button>
      </div>

      {preferencesOpen && (
        <div id={PREFERENCES_PANEL_ID} className="mb-3">
          <ThemeSelector />
        </div>
      )}

      <Button variant="secondary" size="sm" fullWidth onClick={logout}>
        Cerrar sesión
      </Button>
    </div>
  );
}
