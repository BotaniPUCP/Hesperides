'use client';

import { useRouter } from 'next/navigation';
import { Breadcrumb, EmptyState } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { puedeRegistrar } from '@/components/catastro/permisos';
import { RegistroEspecieForm } from '@/components/inventario-verde/RegistroEspecieForm';

export default function RegistrarEspeciePage() {
  const { user } = useAuth();
  const router = useRouter();
  const canRegister = puedeRegistrar(user?.role.code);

  return (
    <main className="min-h-screen bg-neutral-50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <Breadcrumb
          items={[
            { label: 'Inventario de Especies', href: '/inventario-verde' },
            { label: 'Registrar especie' },
          ]}
        />

        <div className="border-b border-neutral-200/80 pb-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900">
            Registrar especie botánica
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            Catálogo de flora institucional · Pontificia Universidad Católica del Perú
          </p>
        </div>

        {!canRegister ? (
          <EmptyState
            title="Acceso restringido"
            description="El registro de nuevas especies botánicas en el catálogo requiere permisos de Administración, Coordinación o Supervisión."
            action={{
              label: 'Volver al catálogo',
              onClick: () => router.push('/inventario-verde'),
            }}
          />
        ) : (
          <RegistroEspecieForm />
        )}
      </div>
    </main>
  );
}
