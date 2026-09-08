'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

/**
 * Inicio. Reparte por rol una vez la sesión está cargada; sin sesión, /login.
 */
export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (user === null) {
      router.replace('/login');
    } else if (user.mustChangePassword) {
      router.replace('/cambiar-password');
    } else if (user.role.code === 'ADMIN') {
      router.replace('/admin/usuarios');
    }
  }, [isLoading, user, router]);

  if (isLoading || user === null) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-8">
        <LoadingSkeleton variant="card" className="max-w-md" />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 bg-slate-50 p-24 text-center">
      <h1 className="text-4xl font-bold text-slate-900">Hesperides</h1>
      <p className="text-slate-500">
        Bienvenido{user.firstName ? `, ${user.firstName}` : ''}. Gestión de áreas verdes PUCP.
      </p>
    </main>
  );
}