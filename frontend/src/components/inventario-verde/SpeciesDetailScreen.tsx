'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BackButton, Breadcrumb, Card, EmptyState, LoadingSkeleton } from '@/components/ui';
import { puedeRegistrar } from '@/components/catastro/permisos';
import { useAuth } from '@/hooks/useAuth';
import { useInventarioVerdeSpeciesBySlug } from '@/hooks/useInventarioVerde';
import { useRememberedHref } from '@/hooks/useRememberedHref';
import { useRequest } from '@/hooks/useRequest';
import { inventarioVerdeApi } from '@/lib/inventario-verde-api';
import type { LocationCount } from '@shared/types';
import { SpeciesInfo } from './SpeciesInfo';

export interface SpeciesDetailScreenProps {
  slug: string;
}

const LIST_PATH = '/inventario-verde';

export function SpeciesDetailScreen({ slug }: SpeciesDetailScreenProps) {
  const router = useRouter();
  const { user } = useAuth();
  const listHref = useRememberedHref(LIST_PATH);
  const { species, loading: speciesLoading, errorMessage } = useInventarioVerdeSpeciesBySlug(slug);

  const locations = useRequest(slug || null, () => inventarioVerdeApi.locations(slug));
  const availableLocations = (locations.data ?? []) as LocationCount[];

  if (speciesLoading) {
    return (
      <div className="flex flex-col gap-6">
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="table-row" count={3} />
      </div>
    );
  }

  if (!species) {
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumb
          items={[
            { label: 'Especies', href: listHref },
            { label: 'No encontrada' },
          ]}
        />
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
    <div className="flex flex-col max-w-5xl mx-auto w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BackButton fallbackHref={LIST_PATH} />
          <Breadcrumb
            items={[
              { label: 'Especies', href: listHref },
              { label: species.commonName },
            ]}
          />
        </div>
        {puedeRegistrar(user?.role.code) && (
          <Link
            href={`${LIST_PATH}/especies/${species.slug}/editar`}
            className="surface-pill text-sm font-medium text-neutral-700 hover:text-neutral-900 transition-colors"
          >
            Editar especie
          </Link>
        )}
      </div>

      {/* Cabecera taxonómica e información de la especie */}
      <SpeciesInfo species={species} availableLocations={availableLocations} />

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
    </div>
  );
}
