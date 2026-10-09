'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

const ANCHO_SIDEBAR = 'w-64';

/**
 * Armazón de toda pantalla con sesión. En escritorio el sidebar está fijo a la
 * izquierda; en móvil se esconde tras un botón y se abre como panel.
 *
 * Qué variante se ve lo decide el CSS (`md:`), no un `matchMedia` en JS: así no
 * hay un primer render con la variante equivocada mientras se mide la pantalla.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const cerrarMenu = () => setMenuAbierto(false);

  useEffect(() => {
    if (!menuAbierto) return;
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setMenuAbierto(false);
    };
    document.addEventListener('keydown', alPulsar);
    return () => document.removeEventListener('keydown', alPulsar);
  }, [menuAbierto]);

  return (
    <div className="min-h-screen bg-neutral-50 md:flex">
      <aside className={`hidden ${ANCHO_SIDEBAR} shrink-0 border-r border-neutral-200 md:block`}>
        <div className="sticky top-0 h-screen">
          <Sidebar />
        </div>
      </aside>

      <header className="flex items-center gap-3 border-b border-neutral-200 bg-neutral-0 px-4 py-3 md:hidden">
        <button
          type="button"
          aria-label="Abrir menú"
          aria-expanded={menuAbierto}
          onClick={() => setMenuAbierto(true)}
          className="rounded-md px-2 py-1 text-xl text-neutral-700 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
        >
          ☰
        </button>
        <span className="text-base font-bold text-brand-700">Hesperides</span>
      </header>

      {menuAbierto && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            data-testid="menu-overlay"
            className="absolute inset-0 bg-ink/40"
            onClick={cerrarMenu}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menú"
            className={`absolute inset-y-0 left-0 ${ANCHO_SIDEBAR} shadow-xl`}
          >
            <Sidebar onNavigate={cerrarMenu} />
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
