'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { SpeciesPhoto, SpecimenDetail } from '@shared/types';
import { Badge, Button, ImagePlaceholder } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { puedeEditarEjemplar, esPersonalOperativo } from '@/components/catastro/permisos';
import { SpecimenMeasures } from './SpecimenMeasures';
import { SpeciesPhotoViewer } from './SpeciesPhotoViewer';
import { SpecimenEditModal } from './SpecimenEditModal';

export interface SpecimenInfoProps {
  specimen: SpecimenDetail;
  onSpecimenUpdated?: () => void;
}

function DetailPill({
  icon,
  label,
  children,
  wide = false,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={`p-3.5 rounded-2xl bg-neutral-50/70 border border-neutral-200/80 hover:border-neutral-300 transition-all flex flex-col justify-between min-h-[76px] ${wide ? 'sm:col-span-2' : ''
        }`}
    >
      <div className="flex items-center gap-1.5 mb-1.5 text-neutral-500">
        {icon && <span className="text-neutral-400 shrink-0">{icon}</span>}
        <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider truncate">{label}</p>
      </div>
      <div className="text-neutral-900 font-semibold text-sm leading-snug">{children}</div>
    </div>
  );
}

const muted = (text: string) => <span className="text-neutral-400 font-normal italic">{text}</span>;

export function SpecimenInfo({ specimen, onSpecimenUpdated }: SpecimenInfoProps) {
  const router = useRouter();
  const { user } = useAuth();
  const canEdit = puedeEditarEjemplar(user?.role.code);
  const canViewInternalData = esPersonalOperativo(user?.role.code);

  const [imageError, setImageError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleUpdateSuccess = () => {
    if (onSpecimenUpdated) {
      onSpecimenUpdated();
    } else {
      router.refresh();
    }
  };

  const { species } = specimen;
  const hasCoords = specimen.latitude !== null && specimen.longitude !== null;

  // Foto real del ejemplar entregada por el backend
  const specimenPhotos: SpeciesPhoto[] =
    specimen.imageUrl || specimen.thumbnailUrl
      ? [
          {
            imageUrl: specimen.imageUrl ?? specimen.thumbnailUrl ?? '',
            thumbnailUrl: specimen.thumbnailUrl ?? specimen.imageUrl ?? '',
            author: specimen.sourceLocation
              ? `Ubicación: ${specimen.sourceLocation}`
              : 'Foto de campo (Vista general)',
            license: specimen.sourceReference ? `Ref: ${specimen.sourceReference}` : null,
            sourceUrl: specimen.photoUrl ?? null,
          },
        ]
      : [];

  const hasPhotos = specimenPhotos.length > 0 && !imageError;
  const currentPhoto = specimenPhotos[photoIndex] ?? specimenPhotos[0];

  // Fallback botánico: si la foto de campo en Drive falla o no existe, recurre a la foto de su especie
  const speciesFallbackPhoto = species.imageUrl ?? species.photos?.[0]?.imageUrl ?? null;
  const [speciesImageError, setSpeciesImageError] = useState(false);
  const isUsingSpeciesFallback = !hasPhotos && Boolean(speciesFallbackPhoto) && !speciesImageError;
  const displayPhotoUrl = hasPhotos
    ? (currentPhoto?.imageUrl ?? currentPhoto?.thumbnailUrl)
    : isUsingSpeciesFallback
    ? speciesFallbackPhoto
    : null;

  const activeViewerPhotos: SpeciesPhoto[] = hasPhotos
    ? specimenPhotos
    : isUsingSpeciesFallback && speciesFallbackPhoto
    ? species.photos && species.photos.length > 0
      ? species.photos
      : [
          {
            imageUrl: speciesFallbackPhoto,
            thumbnailUrl: speciesFallbackPhoto,
            author: `Fotografía botánica referencial (${species.commonName})`,
            license: 'Referencia de especie',
            sourceUrl: null,
          },
        ]
    : [];

  const copyCoordinates = () => {
    if (hasCoords) {
      navigator.clipboard.writeText(`${specimen.latitude}, ${specimen.longitude}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      {/* TARJETA SUPERIOR HERO / ID CARD INTEGRADA */}
      <div className="rounded-3xl border border-neutral-200/90 bg-neutral-0 shadow-sm overflow-hidden mb-6 transition-shadow hover:shadow-md">
        <div className="p-5 sm:p-7 bg-gradient-to-br from-brand-50/40 via-brand-50/10 to-transparent">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Lado Izquierdo: Foto + Bloque Botánico Principal */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 min-w-0">
              {/* Foto compacta tipo ID Card con selector de galería */}
              <div className="relative shrink-0">
                <div
                  className="h-28 w-28 sm:h-32 sm:w-32 rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200 shadow-xs cursor-zoom-in relative group"
                  onClick={() => (hasPhotos || isUsingSpeciesFallback) && setModalOpen(true)}
                  title={
                    hasPhotos
                      ? 'Clic para ampliar foto a pantalla completa'
                      : isUsingSpeciesFallback
                      ? `Foto referencial de ${species.commonName} (Clic para ampliar)`
                      : undefined
                  }
                >
                  {displayPhotoUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={displayPhotoUrl}
                        alt={`Ejemplar ${specimen.code}`}
                        loading="lazy"
                        onError={() => {
                          if (hasPhotos) {
                            setImageError(true);
                          } else {
                            setSpeciesImageError(true);
                          }
                        }}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {hasPhotos && specimenPhotos.length > 1 && (
                        <span className="pointer-events-none absolute bottom-1.5 right-1.5 rounded bg-ink/80 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-xs">
                          {`${photoIndex + 1}/${specimenPhotos.length}`}
                        </span>
                      )}
                      {isUsingSpeciesFallback && (
                        <span className="pointer-events-none absolute bottom-1 left-1 right-1 rounded bg-ink/75 px-1 py-0.5 text-[9px] font-medium text-white text-center truncate backdrop-blur-2xs">
                          Foto referencial
                        </span>
                      )}
                    </>
                  ) : (
                    <ImagePlaceholder
                      type={species.vegetationTypeCode}
                      label={specimen.code}
                      size="sm"
                      className="rounded-none border-none h-full w-full"
                    />
                  )}
                </div>

                {/* Enlace original en Drive como pill discreta */}
                {specimen.photoUrl && (
                  <div className="mt-1.5 text-center">
                    <a
                      href={specimen.photoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 hover:underline transition-colors"
                      title="Abrir fotografía original de campo en Google Drive"
                    >
                      <span>Original en Drive</span>
                      <svg className="w-3 h-3 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                )}
              </div>

              {/* Información botánica y operativa */}
              <div className="flex flex-col min-w-0">
                {/* Fila de etiquetas de clasificación y estado */}
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <Badge label={species.vegetationTypeName} color="brand" />
                  {species.family && (
                    <Badge label={`Fam. ${species.family}`} color="neutral" />
                  )}
                  {specimen.elementTypeCode === 'GROUP' && (
                    <Badge label={`Agrupación (${specimen.quantity})`} color="neutral" />
                  )}
                  <Badge
                    label={specimen.dataSource === 'MEASURED' ? 'Medido en campo' : 'Sin medir'}
                    color={specimen.dataSource === 'MEASURED' ? 'neutral' : 'warning'}
                  />
                </div>

                {/* Código principal destacado */}
                <div className="flex items-baseline gap-3 flex-wrap">
                  <h1 className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight font-mono whitespace-nowrap">
                    {specimen.code}
                  </h1>
                  {(specimen.sourceReference || specimen.legacyCode) && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {specimen.sourceReference && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-neutral-100 border border-neutral-200 text-xs font-mono font-medium text-neutral-700 shadow-2xs">
                          Ref: {specimen.sourceReference}
                        </span>
                      )}
                      {specimen.legacyCode && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-neutral-100 border border-neutral-200 text-xs font-mono font-medium text-neutral-600 shadow-2xs">
                          Placa: {specimen.legacyCode}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Nombre común y científico */}
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <span className="text-lg sm:text-xl font-bold text-neutral-800 leading-tight">
                    {species.commonName}
                  </span>
                  <span className="text-neutral-300 font-light select-none">·</span>
                  <span className="text-sm italic text-neutral-500 font-serif">
                    {species.scientificName}
                  </span>
                </div>

                {/* Metadatos Rápidos: Ubicación y GPS en una sola línea integrada */}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-neutral-200/60 text-xs text-neutral-600 flex-wrap">
                  {/* Ubicación */}
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="font-semibold text-neutral-800">
                      {specimen.section ? specimen.section.name : (specimen.sourceLocation ?? 'Campus PUCP')}
                    </span>
                    {specimen.sourceLocation && specimen.section && (
                      <span className="text-neutral-400">({specimen.sourceLocation})</span>
                    )}
                  </div>

                  {/* Coordenadas GPS con botón copiar integrado */}
                  {hasCoords && (
                    <div className="flex items-center gap-1.5 pl-3 border-l border-neutral-200">
                      <span className="text-neutral-400">GPS:</span>
                      <span className="font-mono font-medium text-neutral-700">
                        {Number(specimen.latitude).toFixed(5)}, {Number(specimen.longitude).toFixed(5)}
                      </span>
                      <button
                        type="button"
                        onClick={copyCoordinates}
                        className="ml-0.5 p-1 rounded-md hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors shadow-2xs border border-transparent hover:border-neutral-200"
                        title={copied ? '¡Copiado!' : 'Copiar coordenadas GPS'}
                        aria-label="Copiar coordenadas GPS"
                      >
                        {copied ? (
                          <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Lado Derecho: Acciones Contextuales en Bloque Vertical/Horizontal Limpio */}
            <div className="flex flex-row lg:flex-col items-center lg:items-end justify-start gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-neutral-200/60">
              {canEdit && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setEditModalOpen(true)}
                  leadingIcon={
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  }
                >
                  Actualizar medidas
                </Button>
              )}
              <Link href={`/mapa?codigo=${encodeURIComponent(specimen.code)}`} className="w-full sm:w-auto">
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  leadingIcon={
                    <svg className="w-3.5 h-3.5 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  }
                >
                  Ver en Mapa 3D
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* GRID EN 2 COLUMNAS EQUILIBRADAS (50% / 50%) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch mb-6">
        {/* Columna Izquierda: Dendrometría */}
        <div className="p-5 rounded-3xl bg-neutral-0 border border-neutral-200/90 shadow-sm flex flex-col h-full justify-between">
          <SpecimenMeasures specimen={specimen} showOperationalRegime={canViewInternalData} />
        </div>

        {/* Columna Derecha: Territorio y Gobernanza del Ejemplar */}
        <div className="p-5 rounded-3xl bg-neutral-0 border border-neutral-200/90 shadow-sm flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-neutral-100">
              <span className="p-1 rounded-md bg-neutral-100 text-neutral-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </span>
              <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                Territorio y Datos Registrales
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DetailPill
                label="Área Verde"
                icon={
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                }
              >
                {specimen.section ? (
                  <span>
                    {specimen.section.name === specimen.section.code
                      ? specimen.section.name
                      : `${specimen.section.name} (${specimen.section.code})`}
                  </span>
                ) : (
                  muted('Fuera de las áreas verdes')
                )}
              </DetailPill>

              <DetailPill
                label="Lugar / Referente"
                icon={
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
              >
                {specimen.sourceLocation ?? muted('Sin referente registrado')}
              </DetailPill>

              <DetailPill
                label="Tipo de Registro"
                icon={
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              >
                <span>
                  {specimen.elementTypeName ?? (specimen.elementTypeCode === 'GROUP' ? 'Agrupación' : 'Ejemplar individual')}
                </span>
              </DetailPill>

              <DetailPill
                label="Protección Física"
                icon={
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                }
              >
                {specimen.isBanded !== null ? (
                  <span>{specimen.isBanded ? 'Con zunchado' : 'Sin zunchado'}</span>
                ) : (
                  muted('Sin registrar')
                )}
              </DetailPill>
            </div>
          </div>

          {/* Observaciones de campo integradas */}
          {specimen.notes && (
            <div className="mt-3.5 pt-3 border-t border-neutral-100 flex items-start gap-2.5 text-xs">
              <span className="p-1 rounded-md bg-neutral-100 text-neutral-600 shrink-0 mt-0.5" aria-hidden="true">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </span>
              <div className="min-w-0">
                <span className="font-bold text-neutral-700">
                  Observaciones de campo:{' '}
                </span>
                <span className="text-neutral-600 leading-relaxed italic">
                  «{specimen.notes}»
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Visor inmersivo a pantalla completa para la galería del ejemplar */}
      {(hasPhotos || isUsingSpeciesFallback) && modalOpen && activeViewerPhotos.length > 0 && (
        <SpeciesPhotoViewer
          photos={activeViewerPhotos}
          startAt={hasPhotos ? photoIndex : 0}
          speciesName={
            hasPhotos
              ? `Ejemplar ${specimen.code} · ${species.commonName}`
              : `Foto referencial · ${species.commonName} (${species.scientificName})`
          }
          onClose={() => setModalOpen(false)}
        />
      )}

      {/* Modal para actualizar medidas dendrométricas */}
      {editModalOpen && (
        <SpecimenEditModal
          specimen={specimen}
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSuccess={handleUpdateSuccess}
        />
      )}
    </>
  );
}
