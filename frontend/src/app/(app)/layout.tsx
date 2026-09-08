'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

/**
 * Capa de sesión de todas las páginas autenticadas (SPEC-100 §5.2, §7.1):
 * - Sin sesión → /login.
 * - mustChangePassword = TRUE → /cambiar-password, sin navegación.
 * - Tras cambiarla se sale a / (inicio), que reparte por rol.
 */
export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (user === null) {
      router.replace('/login');
      return;
    }
    if (user.mustChangePassword && pathname !== '/cambiar-password') {
      router.replace('/cambiar-password');
    } else if (!user.mustChangePassword && pathname === '/cambiar-password') {
      router.replace('/');
    }
  }, [isLoading, user, pathname, router]);

  if (isLoading || user === null) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <LoadingSkeleton variant="card" count={3} />
      </main>
    );
  }

  const showNavigation = !user.mustChangePassword;
  const isAdmin = user.role.code === 'ADMIN';

  return (
    <div className="min-h-screen bg-slate-50">
      {showNavigation && (
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-semibold text-slate-900">
              Hesperides
            </Link>
            {isAdmin && (
              <Link
                href="/admin/usuarios"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Usuarios
              </Link>
            )}
          </div>
        </header>
      )}
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}