'use client';

import { useState } from 'react';
import type { Specimen } from '@shared/types';
import { DataTable, type DataTableColumn, type DataTableSort, ImagePlaceholder } from '@/components/ui';
import { SpecimenPhotoModal } from './SpecimenPhotoModal';

export interface SpecimenTableProps {
  specimens: Specimen[];
  totalElements: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  onSortChange: (sort: DataTableSort) => void;
  onViewOnMap?: (specimen: Specimen) => void;
  loading?: boolean;
}

function cleanSpecimenCode(code: string | null | undefined): string | null {
  if (!code) return null;
  const trimmed = code.trim();
  if (trimmed === '' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'nan') return null;
  return trimmed.endsWith('.0') ? trimmed.slice(0, -2) : trimmed;
}

function ThumbnailCell({
  specimen,
  onPhotoClick,
}: {
  specimen: Specimen;
  onPhotoClick: (specimen: Specimen) => void;
}) {
  const [error, setError] = useState(false);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onPhotoClick(specimen);
      }}
      title={`Ampliar fotografía de ${specimen.reference}`}
      aria-label={`Ver fotografía ampliada de ${specimen.reference}`}
      className="group relative h-9 w-9 rounded-md overflow-hidden bg-neutral-100 flex-shrink-0 border border-neutral-200/90 hover:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600 transition-all cursor-pointer"
    >
      {specimen.photoUrl && !error ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={specimen.photoUrl}
          alt={specimen.reference}
          loading="lazy"
          onError={() => setError(true)}
          className="h-full w-full object-cover transition-transform duration-150 group-hover:scale-105"
        />
      ) : (
        <ImagePlaceholder
          type={specimen.vegetationTypeCode}
          size="sm"
          className="h-full w-full rounded-none border-none p-0.5"
          label=""
        />
      )}
      <span className="absolute inset-0 bg-neutral-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </span>
    </button>
  );
}

export function SpecimenTable({
  specimens,
  totalElements,
  page,
  pageSize,
  onPageChange,
  sortBy,
  sortDirection,
  onSortChange,
  onViewOnMap,
  loading = false,
}: SpecimenTableProps) {
  const [selectedPhotoSpecimen, setSelectedPhotoSpecimen] = useState<Specimen | null>(null);

  function handleMapAction(specimen: Specimen) {
    if (onViewOnMap) {
      onViewOnMap(specimen);
    }
  }

  const columns: DataTableColumn<Specimen>[] = [
    {
      key: 'photo',
      header: 'Foto',
      sortable: false,
      className: 'w-16 sm:w-20 text-center',
      headerClassName: 'w-16 sm:w-20 text-center',
      render: (row) => (
        <ThumbnailCell specimen={row} onPhotoClick={setSelectedPhotoSpecimen} />
      ),
    },
    {
      key: 'reference',
      header: 'Referencia / Código',
      sortable: true,
      className: 'w-[28%] min-w-[150px]',
      headerClassName: 'w-[28%]',
      render: (row) => {
        const codeDisplay = cleanSpecimenCode(row.code);
        return (
          <div className="flex flex-col items-start gap-0.5 py-0.5">
            <span className="font-mono font-bold text-neutral-900 text-xs">
              {row.reference}
            </span>
            {codeDisplay ? (
              <span className="text-[11px] font-mono text-neutral-500 font-medium">
                Cód. {codeDisplay}
              </span>
            ) : (
              <span className="text-[11px] text-neutral-400 font-normal">
                Sin código
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'location',
      header: 'Sector / Ubicación',
      sortable: true,
      className: 'w-[36%] min-w-[180px]',
      headerClassName: 'w-[36%]',
      render: (row) => (
        <span className="text-xs font-medium text-neutral-800">
          {row.location}
        </span>
      ),
    },
    {
      key: 'coordinates',
      header: 'Coordenadas (GPS)',
      sortable: false,
      hideOnMobile: true,
      className: 'w-[180px] whitespace-nowrap',
      headerClassName: 'w-[180px] whitespace-nowrap',
      render: (row) => {
        const hasCoords = row.latitude !== null && row.longitude !== null;

        if (hasCoords) {
          return (
            <span className="font-mono text-xs text-neutral-600">
              {row.latitude?.toFixed(5)}, {row.longitude?.toFixed(5)}
            </span>
          );
        }
        return <span className="text-neutral-400 text-xs italic">No registradas</span>;
      },
    },
    {
      key: 'actions',
      header: 'Acciones',
      sortable: false,
      className: 'w-[140px] whitespace-nowrap text-right',
      headerClassName: 'w-[140px] whitespace-nowrap text-right',
      render: (row) => {
        const hasCoords = row.latitude !== null && row.longitude !== null;

        return (
          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
            {/* Botón "Ver en mapa" visible permanentemente en escritorio (variante secondary/ghost de SPEC-C01) */}
            {hasCoords ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMapAction(row);
                }}
                title={`Ver ubicación de ${row.reference} en el mapa`}
                aria-label={`Ver ubicación de ${row.reference} en el mapa`}
                className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium text-brand-800 bg-brand-50/70 hover:bg-brand-100 hover:text-brand-900 hover:border-brand-300 border border-brand-200/80 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-1"
              >
                <svg
                  className="w-3.5 h-3.5 text-brand-700 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>Ver en mapa</span>
              </button>
            ) : (
              <span className="text-[11px] text-neutral-400 italic">Sin mapa</span>
            )}

            {/* Indicador discreto de observación: SOLO visible si el ejemplar tiene observación */}
            {row.observations && (
              <div className="relative group/obs inline-flex items-center">
                <span
                  tabIndex={0}
                  role="note"
                  aria-label={`Observación: ${row.observations}`}
                  className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-amber-50 text-amber-800 border border-amber-200/90 hover:bg-amber-100 transition-colors cursor-help focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <svg
                    className="w-3.5 h-3.5 text-amber-700 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                    />
                  </svg>
                </span>

                {/* Tooltip accesible con título "Observación" y contenido */}
                <div className="pointer-events-none absolute right-0 bottom-full mb-1.5 hidden group-hover/obs:flex group-focus-within/obs:flex flex-col items-end z-30 w-max max-w-xs">
                  <div className="bg-neutral-900 text-neutral-0 text-xs rounded-md py-1.5 px-2.5 leading-snug border border-neutral-700 text-left shadow-lg">
                    <span className="font-semibold text-amber-300 block text-[10px] uppercase tracking-wider mb-0.5">
                      Observación
                    </span>
                    <span className="break-words">{row.observations}</span>
                  </div>
                  <div className="w-2 h-2 bg-neutral-900 rotate-45 mr-2.5 -mt-1 border-r border-b border-neutral-700" />
                </div>
              </div>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <DataTable<Specimen>
        columns={columns}
        rows={specimens}
        rowKey={(row) => row.id}
        totalElements={totalElements}
        page={page}
        pageSize={pageSize}
        onPageChange={onPageChange}
        sort={{ key: sortBy, direction: sortDirection }}
        onSortChange={onSortChange}
        loading={loading}
      />

      {/* Visor lightbox enfocado exclusivamente en la fotografía */}
      <SpecimenPhotoModal
        specimen={selectedPhotoSpecimen}
        onClose={() => setSelectedPhotoSpecimen(null)}
      />
    </>
  );
}
