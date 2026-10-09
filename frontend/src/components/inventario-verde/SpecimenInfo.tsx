'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { SpecimenDetail } from '@shared/types';
import { Badge, Card, ImagePlaceholder } from '@/components/ui';
import { SpecimenMeasures } from './SpecimenMeasures';

export interface SpecimenInfoProps {
  specimen: SpecimenDetail;
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`p-3.5 rounded-lg bg-neutral-50 border border-neutral-200 ${wide ? 'sm:col-span-2' : ''}`}>
      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">{label}</p>
      <div className="text-neutral-900 font-semibold text-sm">{children}</div>
    </div>
  );
}

const muted = (text: string) => <span className="text-neutral-500 font-normal italic">{text}</span>;

export function SpecimenInfo({ specimen }: SpecimenInfoProps) {
  const [imageError, setImageError] = useState(false);
  const { species } = specimen;
  const hasCoords = specimen.latitude !== null && specimen.longitude !== null;
  const showPhoto = specimen.thumbnailUrl && !imageError;

  return (
    <Card padded className="border-neutral-200 bg-neutral-0 shadow-sm overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="h-80 w-full rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200 relative shadow-inner">
            {showPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={specimen.imageUrl ?? specimen.thumbnailUrl ?? undefined}
                alt={`Ejemplar ${specimen.code}`}
                loading="lazy"
                onError={() => setImageError(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <ImagePlaceholder type={species.vegetationTypeCode} label={`Ejemplar ${specimen.code}`} size="full" className="rounded-none border-none" />
            )}
          </div>
          {specimen.photoUrl && (
            <a
              href={specimen.photoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-700 hover:text-brand-900 hover:underline text-center font-medium"
            >
              Abrir la foto original en Drive
            </a>
          )}
          {specimen.photoUrl && !showPhoto && (
            <p className="text-[11px] text-neutral-500 text-center">
              La foto no se puede mostrar aquí: probablemente el archivo de Drive no está compartido públicamente.
            </p>
          )}
        </div>

        <div className="lg:col-span-7 flex flex-col">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge label={species.vegetationTypeName} color="brand" />
            {specimen.elementTypeCode === 'GROUP' && <Badge label={`Agrupación de ${specimen.quantity}`} color="neutral" />}
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 tracking-tight font-mono">{specimen.code}</h1>
          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            <Link href={`/inventario-verde/especies/${species.slug}`} className="text-base font-semibold text-brand-700 hover:text-brand-900 hover:underline">
              {species.commonName}
            </Link>
            <span className="text-sm italic text-neutral-500 font-serif">({species.scientificName})</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-neutral-100">
            <Field label="Sección">{specimen.section ? `${specimen.section.name} (${specimen.section.code})` : muted('Fuera de las áreas verdes')}</Field>
            <Field label="Ubicación en el catastro">{specimen.sourceLocation ?? muted('Sin ubicación')}</Field>
            <Field label="Referencia del catastro">
              <span className="font-mono">{specimen.sourceReference ?? '—'}</span>
            </Field>
            <Field label="Placa antigua">{specimen.legacyCode ? <span className="font-mono">{specimen.legacyCode}</span> : muted('Sin placa')}</Field>
            <Field label="Coordenadas (GPS)" wide>
              {hasCoords ? <span className="font-mono font-normal">{specimen.latitude}, {specimen.longitude}</span> : muted('No registradas')}
            </Field>
            <SpecimenMeasures specimen={specimen} />
            {specimen.notes && <Field label="Observaciones" wide><span className="font-normal">{specimen.notes}</span></Field>}
          </div>
        </div>
      </div>
    </Card>
  );
}
