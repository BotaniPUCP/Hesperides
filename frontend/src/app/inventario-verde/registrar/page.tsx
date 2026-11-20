'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/ui';
import { PageHeader } from '@/components/layouts/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { puedeRegistrar } from '@/components/catastro/permisos';
import { useUnsavedChangesGuard } from '@/components/forms/unsaved/useUnsavedChangesGuard';
import { RegistroEspecieForm } from '@/components/inventario-verde/RegistroEspecieForm';

const LIST_PATH = '/inventario-verde';

export default function RegistrarEspeciePage() {
  const { user } = useAuth();
  const router = useRouter();
  const canRegister = puedeRegistrar(user?.role.code);
  const [dirty, setDirty] = useState(false);
  const guard = useUnsavedChangesGuard(dirty);

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
            onClick: () => router.push(LIST_PATH),
          }}
        />
      ) : (
        <RegistroEspecieForm
          onDirtyChange={setDirty}
          onCancel={() => guard.confirm(() => router.push(LIST_PATH))}
          onSuccess={(created) => guard.navigate(`${LIST_PATH}/especies/${created.slug}`)}
        />
      )}
      {guard.dialog}
    </div>
  );
}
