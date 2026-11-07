'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumb, EmptyState, LoadingSkeleton } from '@/components/ui';
import { puedeRegistrar } from '@/components/catastro/permisos';
import { useUnsavedChangesGuard } from '@/components/forms/unsaved/useUnsavedChangesGuard';
import { useAuth } from '@/hooks/useAuth';
import { useInventarioVerdeSpeciesBySlug } from '@/hooks/useInventarioVerde';
import { EdicionEspecieForm } from './EdicionEspecieForm';

const LIST_PATH = '/inventario-verde';

export function EdicionEspecieScreen({ slug }: { slug: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { species, loading, errorMessage } = useInventarioVerdeSpeciesBySlug(slug);
  const [sucio, setSucio] = useState(false);
  const guard = useUnsavedChangesGuard(sucio);
  const fichaHref = `${LIST_PATH}/especies/${slug}`;
  const alCambiarSucio = useCallback((valor: boolean) => setSucio(valor), []);

  if (loading) return <LoadingSkeleton variant="card" />;

  if (!puedeRegistrar(user?.role.code)) {
    return (
      <EmptyState
        title="Acceso restringido"
        description="Editar especies requiere permisos de Administración, Coordinación o Supervisión."
        action={{ label: 'Volver a la ficha', onClick: () => router.push(fichaHref) }}
      />
    );
  }

  if (!species) {
    return (
      <EmptyState
        title={errorMessage ? 'No se pudo cargar la especie' : 'Especie no encontrada'}
        description={errorMessage ?? 'La especie solicitada no está registrada en el inventario.'}
        action={{ label: 'Volver a especies', onClick: () => router.push(LIST_PATH) }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Especies', href: LIST_PATH },
          { label: species.commonName || species.scientificName, href: fichaHref },
          { label: 'Editar' },
        ]}
      />
      <EdicionEspecieForm
        species={species}
        onDirtyChange={alCambiarSucio}
        onCancel={() => guard.confirm(() => router.push(fichaHref))}
        onSaved={() => guard.navigate(fichaHref)}
      />
      {guard.dialog}
    </div>
  );
}
