'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { usePageTrail } from '@/components/layouts/PageTrailContext';
import { Button, Card, EmptyState, LoadingSkeleton } from '@/components/ui';
import { puedeDarDeBaja, puedeRegistrar } from '@/components/catastro/permisos';
import { useAuth } from '@/hooks/useAuth';
import { useInventarioVerdeSpeciesBySlug } from '@/hooks/useInventarioVerde';
import { useRememberedHref } from '@/hooks/useRememberedHref';
import { useFocusRevision } from '@/hooks/useFocusRevision';
import { useRequest } from '@/hooks/useRequest';
import { inventarioVerdeApi } from '@/lib/inventario-verde-api';
import { DefinitiveDeactivationModal } from './DefinitiveDeactivationModal';
import type { LocationCount } from '@shared/types';
import { SpeciesInfo } from './SpeciesInfo';

export interface SpeciesDetailScreenProps {
  slug: string;
}

const LIST_PATH = '/inventario-verde';

export function SpeciesDetailScreen({ slug }: SpeciesDetailScreenProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [reloadKey, setReloadKey] = useState(0);
  const [deactivationOpen, setDeactivationOpen] = useState(false);
  const listHref = useRememberedHref(LIST_PATH);
  const focusRevision = useFocusRevision();
  const { species, loading: speciesLoading, errorMessage } = useInventarioVerdeSpeciesBySlug(slug, focusRevision + reloadKey);

  const locations = useRequest(slug ? `${slug}:${focusRevision}` : null, () => inventarioVerdeApi.locations(slug));
  const availableLocations = (locations.data ?? []) as LocationCount[];
  usePageTrail(species ? { labels: { [slug]: species.commonName } } : {});

  if (speciesLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="table-row" count={3} />
      </div>
    );
  }

  if (!species) {
    return (
      <div className="space-y-6">
        <EmptyState
          title={errorMessage ? 'No se pudo cargar la especie' : 'Especie no encontrada'}
          description={errorMessage ?? 'La especie solicitada no está registrada en el inventario.'}
          action={{
            label: 'Volver a especies',
            onClick: () => router.push(listHref),
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabecera taxonómica e información de la especie */}
      <SpeciesInfo
        species={species}
        availableLocations={availableLocations}
        actions={(
          <>
            {puedeRegistrar(user?.role.code) && species.isActive === true && (
              <Link
                href={`${LIST_PATH}/especies/${species.slug}/editar`}
                className="surface-pill text-sm font-medium text-neutral-700 hover:text-neutral-900 transition-colors"
              >
                Editar especie
              </Link>
            )}
            {puedeDarDeBaja(user?.role.code) && species.isActive === true && (
              <Button variant="danger" size="sm" onClick={() => setDeactivationOpen(true)}>
                Dar de baja
              </Button>
            )}
          </>
        )}
      />

      {/* Tarjeta de vinculación con el Catastro Físico de Ejemplares */}
      <Card title="Presencia y Catastro de Ejemplares">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-1">
          <div className="space-y-1.5">
            <p className="text-sm text-neutral-700">
              {species.specimenCount > 0 ? (
                <>
                  Actualmente hay{' '}
                  <strong className="text-neutral-900 font-bold font-mono">
                    {species.specimenCount}
                  </strong>{' '}
                  {species.specimenCount === 1 ? 'ejemplar registrado' : 'ejemplares registrados'} de esta especie en el campus universitario.
                </>
              ) : (
                'Esta especie no cuenta con ejemplares censados actualmente en el campus.'
              )}
            </p>
            <p className="text-xs text-neutral-500">
              {species.specimenCount > 0
                ? 'Consulta las coordenadas GPS en el mapa, medidas dendrométricas e historial de podas e intervenciones en el módulo de Catastro.'
                : 'Cuando se registren nuevos ejemplares o intervenciones en el catastro, aparecerán vinculados aquí.'}
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2.5">
            {species.specimenCount > 0 ? (
              <Link
                href={`/catastro/ejemplares?search=${encodeURIComponent(species.commonName || species.scientificName)}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold transition-all shadow-2xs hover:shadow-xs"
              >
                <span aria-hidden="true">🌳</span>
                <span>Ver ejemplares en Catastro</span>
                <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 text-neutral-600 text-xs font-medium">
                Sin ejemplares censados
              </span>
            )}
          </div>
        </div>
      </Card>

      {deactivationOpen && (
        <DefinitiveDeactivationModal
          entityLabel={species.commonName || species.scientificName}
          onCancel={() => setDeactivationOpen(false)}
          onConfirm={async (reason) => {
            await inventarioVerdeApi.deactivateSpecies(species.slug, reason);
            setDeactivationOpen(false);
            if (species.specimenCount === 0) router.push(listHref);
            else setReloadKey((key) => key + 1);
          }}
        />
      )}
    </div>
  );
}
