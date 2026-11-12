'use client';

import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/ui';
import { PageHeader } from '@/components/layouts/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { puedeRegistrar } from '@/components/catastro/permisos';
import { RegistroEspecieForm } from '@/components/inventario-verde/RegistroEspecieForm';

export default function RegistrarEspeciePage() {
  const { user } = useAuth();
  const router = useRouter();
  const canRegister = puedeRegistrar(user?.role.code);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Registrar especie botánica"
        description="Catálogo de flora institucional · Pontificia Universidad Católica del Perú"
      />

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
  );
}
