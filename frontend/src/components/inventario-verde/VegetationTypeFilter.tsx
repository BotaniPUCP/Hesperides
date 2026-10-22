'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import type { VegetationType, SpecimenDetail, Species } from '@shared/types';
import { cn } from '@/lib/cn';
import { Input, ImagePlaceholder } from '@/components/ui';
import { inventarioVerdeApi } from '@/lib/inventario-verde-api';
import rawSpecimensIndex from '@/lib/specimens-index.json';

interface IndexedSpecimen {
  c: string; // Código de ejemplar (ej. EV-000240)
  r: string | null; // Referencia de campo (ej. A231, pd7)
  l: string | null; // Código legacy / placa antigua (ej. 959, 6231)
  s: string; // Slug de la especie
  n: string; // Nombre común
  sc: string; // Nombre científico
  u: string | null; // Ubicación / referencia en campus
}

const specimensIndex = rawSpecimensIndex as IndexedSpecimen[];

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export interface VegetationTypeFilterProps {
  types: VegetationType[];
  selectedType?: string;
  onSelectType: (typeCode: string) => void;
  totalAllCount: number;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  onSpecimenMatch?: (specimen: SpecimenDetail | null) => void;
}

export function VegetationTypeFilter({
  types,
  selectedType = 'ALL',
  onSelectType,
  totalAllCount,
  searchValue = '',
  onSearchChange,
  onSpecimenMatch,
}: VegetationTypeFilterProps) {
  const allChips = [
    { code: 'ALL', label: 'Todos', count: totalAllCount },
    ...types,
  ];

  // Predicción y recomendaciones inteligentes en spotlight popover
  const [matchedSpecimen, setMatchedSpecimen] = useState<SpecimenDetail | null>(null);
  const [suggestedSpecies, setSuggestedSpecies] = useState<Species[]>([]);
  const [isSearchingSpecies, setIsSearchingSpecies] = useState(false);
  const [showDropdown, setShowDropdown] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmed = searchValue.trim();

  // Búsqueda instantánea de ejemplares en el índice local (código, referencia, legacy, nombres, campus)
  // Filtrado y ordenado por relevancia con un máximo estricto de 10 elementos.
  const matchedSpecimens = useMemo<IndexedSpecimen[]>(() => {
    if (trimmed.length < 1) return [];

    const q = trimmed.toLowerCase();
    const qClean = q.replace(/[^a-z0-9]/g, '');
    const nq = normalizeText(trimmed);

    const scored: { item: IndexedSpecimen; score: number }[] = [];

    for (const item of specimensIndex) {
      const codeLower = item.c.toLowerCase();
      const codeClean = codeLower.replace(/[^a-z0-9]/g, '');
      const refLower = item.r ? item.r.toLowerCase() : '';
      const refClean = refLower.replace(/[^a-z0-9]/g, '');
      const legLower = item.l ? item.l.toLowerCase() : '';
      const nameNorm = normalizeText(item.n);
      const sciNorm = normalizeText(item.sc);

      let score: number | null = null;

      // 1. Coincidencia exacta (máxima prioridad)
      if (codeLower === q || codeClean === qClean) {
        score = 1;
      } else if (refLower === q || (qClean && refClean === qClean)) {
        score = 2;
      } else if (legLower === q) {
        score = 3;
      }
      // 2. Coincidencia por prefijo en identificadores (ej. "E", "EV", "A2", "9")
      else if (codeLower.startsWith(q) || (qClean && codeClean.startsWith(qClean))) {
        score = 10;
      } else if (refLower.startsWith(q) || (qClean && refClean.startsWith(qClean))) {
        score = 20;
      } else if (legLower.startsWith(q)) {
        score = 30;
      }
      // 3. Coincidencia por prefijo en nombre común o científico
      else if (nameNorm.startsWith(nq) || nameNorm.split(' ').some((word) => word.startsWith(nq))) {
        score = 40;
      } else if (sciNorm.startsWith(nq) || sciNorm.split(' ').some((word) => word.startsWith(nq))) {
        score = 50;
      }
      // 4. Coincidencia como subcadena en identificadores
      else if (codeLower.includes(q)) {
        score = 60;
      } else if (refLower.includes(q)) {
        score = 70;
      } else if (legLower.includes(q)) {
        score = 80;
      }
      // 5. Coincidencia como subcadena en nombres
      else if (nameNorm.includes(nq)) {
        score = 90;
      } else if (sciNorm.includes(nq)) {
        score = 100;
      }
      // 6. Coincidencia en ubicación o referente
      else if (item.u && normalizeText(item.u).includes(nq)) {
        score = 110;
      }

      if (score !== null) {
        scored.push({ item, score });
      }
    }

    // Ordenar por score ascendente y desempate por código de ejemplar ascendente
    scored.sort((a, b) => a.score - b.score || a.item.c.localeCompare(b.item.c));
    return scored.slice(0, 10).map((s) => s.item);
  }, [trimmed]);

  // Si hay un ejemplar candidato directo (ej. EV-000240), avisar a InventarioVerdeScreen para fallback en la cuadrícula
  useEffect(() => {
    let active = true;

    if (trimmed.length < 3) {
      if (!matchedSpecimen) return;
      const timer = setTimeout(() => {
        if (active) {
          setMatchedSpecimen(null);
          if (onSpecimenMatch) onSpecimenMatch(null);
        }
      }, 0);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }

    const isEvCandidate = /^ev-?\d+$/i.test(trimmed);
    const candidate = matchedSpecimens[0];

    if (!isEvCandidate && matchedSpecimens.length !== 1) {
      if (!matchedSpecimen) return;
      const timer = setTimeout(() => {
        if (active) {
          setMatchedSpecimen(null);
          if (onSpecimenMatch) onSpecimenMatch(null);
        }
      }, 0);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }

    if (candidate && typeof inventarioVerdeApi.specimen === 'function') {
      inventarioVerdeApi
        .specimen(candidate.c)
        .then((specimen) => {
          if (active) {
            setMatchedSpecimen(specimen);
            if (onSpecimenMatch) onSpecimenMatch(specimen);
          }
        })
        .catch(() => {
          if (active) {
            setMatchedSpecimen(null);
            if (onSpecimenMatch) onSpecimenMatch(null);
          }
        });
    }

    return () => {
      active = false;
    };
  }, [trimmed, matchedSpecimens, onSpecimenMatch, matchedSpecimen]);

  // Recomendaciones de especies desde la primera letra
  useEffect(() => {
    let active = true;

    if (trimmed.length < 1) {
      const timer = setTimeout(() => {
        if (active) {
          setSuggestedSpecies([]);
          setIsSearchingSpecies(false);
        }
      }, 0);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }

    const timer = setTimeout(() => {
      setIsSearchingSpecies(true);
      inventarioVerdeApi
        .species({ search: trimmed, page: 0, size: 4 })
        .then((res) => {
          if (active) {
            setSuggestedSpecies(res.content || []);
            setIsSearchingSpecies(false);
          }
        })
        .catch(() => {
          if (active) {
            setSuggestedSpecies([]);
            setIsSearchingSpecies(false);
          }
        });
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [trimmed]);

  // Cerrar dropdown si se hace clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasResults = Boolean(matchedSpecimens.length > 0 || suggestedSpecies.length > 0);
  const isLoadingSpotlight = isSearchingSpecies;

  return (
    <div className="flex flex-col gap-3 mb-4 pb-4 border-b border-neutral-100">
      {/* Barra de Búsqueda unificada con Spotlight inteligente */}
      {onSearchChange && (
        <div ref={containerRef} className="relative w-full">
          <Input
            id="inventario-global-search"
            label=""
            type="search"
            autoComplete="off"
            value={searchValue}
            onChange={(val) => {
              onSearchChange(val);
              setShowDropdown(true);
            }}
            onFocus={() => {
              if (trimmed.length >= 1) {
                setShowDropdown(true);
              }
            }}
            placeholder="Buscar por nombre común, científico, o ejemplar (ej. EV-000240, Ref A231, Placa 959)..."
            leadingIcon={
              <svg
                className="h-4 w-4 text-neutral-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            }
          />

          {/* Popover flotante predictivo con sombra suave y estilo spotlight */}
          {showDropdown && trimmed.length >= 1 && (hasResults || isLoadingSpotlight) && (
            <div
              className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl bg-neutral-0 border border-neutral-200/90 shadow-xl p-2.5 animate-in fade-in slide-in-from-top-2 duration-150 max-h-[480px] overflow-y-auto divide-y divide-neutral-100"
              role="region"
              aria-label="Sugerencias de búsqueda rápida"
            >
              {isLoadingSpotlight && !hasResults ? (
                <div className="flex items-center gap-2.5 px-3 py-3 text-xs text-neutral-500 font-medium">
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-forest-600 border-t-transparent animate-spin" />
                  <span>Explorando catálogo del catastro verde...</span>
                </div>
              ) : null}

              {/* Sección 1: Ejemplares coincidentes (hasta 10 en orden estricto) */}
              {matchedSpecimens.length > 0 && (
                <div className="pb-2">
                  <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-400">
                    <span>Ejemplares coincidentes ({matchedSpecimens.length})</span>
                    <span className="text-[10px] font-normal text-neutral-400 lowercase">
                      código · ref · placa · nombre
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 mt-1">
                    {matchedSpecimens.map((sp) => {
                      const displayLocation =
                        (matchedSpecimen && matchedSpecimen.code === sp.c
                          ? matchedSpecimen.sourceLocation
                          : null) || sp.u;

                      return (
                        <Link
                          key={sp.c}
                          href={`/inventario-verde/especies/${sp.s}/ejemplares/${sp.c}`}
                          onClick={() => setShowDropdown(false)}
                          className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-brand-50/70 border border-transparent hover:border-brand-200/80 transition-all group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-9 w-9 rounded-xl bg-brand-800 text-white flex items-center justify-center font-mono font-bold text-xs shrink-0 shadow-xs">
                              EV
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono font-bold text-xs text-brand-900 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200/80">
                                  {sp.c}
                                </span>
                                <span className="font-bold text-xs text-neutral-900 truncate">
                                  {sp.n}
                                </span>
                                {sp.r && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200/80">
                                    Ref: {sp.r}
                                  </span>
                                )}
                                {sp.l && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-alert-warning-bg text-alert-warning-fg border border-alert-warning-border font-medium">
                                    Placa: {sp.l}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] mt-0.5 truncate">
                                <span className="italic text-neutral-400 truncate">
                                  {sp.sc}
                                </span>
                                {displayLocation && (
                                  <span className="text-neutral-500 truncate">
                                    · {displayLocation}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-900 bg-brand-50 border border-brand-200/80 group-hover:bg-brand-100 group-hover:text-brand-900 shrink-0 transition-colors">
                            Ir directo a la ficha <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sección 2: Especies coincidentes recomendadas */}
              {suggestedSpecies.length > 0 && (
                <div className={matchedSpecimens.length > 0 ? 'pt-2' : ''}>
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Especies coincidentes ({suggestedSpecies.length})
                  </div>
                  <div className="flex flex-col gap-1 mt-1">
                    {suggestedSpecies.map((sp) => {
                      const thumbSrc = sp.imageUrl ? sp.imageUrl.replace(/sz=w\d+/, 'sz=w160') : null;
                      return (
                        <Link
                          key={sp.slug}
                          href={`/inventario-verde/especies/${sp.slug}`}
                          onClick={() => setShowDropdown(false)}
                          className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-neutral-50 border border-transparent hover:border-neutral-200/80 transition-all group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative h-9 w-9 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0 border border-neutral-200/80">
                              {thumbSrc ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={thumbSrc}
                                  alt=""
                                  loading="lazy"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <ImagePlaceholder
                                  type={sp.vegetationTypeCode}
                                  size="sm"
                                  className="h-full w-full rounded-none border-none p-0.5"
                                  label=""
                                />
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-xs text-neutral-900 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                {sp.commonName}
                              </span>
                              <span className="text-[11px] italic text-neutral-400 truncate">
                                {sp.scientificName}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] font-medium text-neutral-500">
                              {sp.specimenCount} {sp.specimenCount === 1 ? 'ejemplar' : 'ejemplares'}
                            </span>
                            <span className="text-neutral-400 text-xs group-hover:translate-x-0.5 transition-transform group-hover:text-neutral-700">
                              →
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Chips de tipo de vegetación */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
          Tipo de vegetación
        </label>

        <div className="flex flex-wrap items-center gap-2 overflow-visible p-1" role="tablist" aria-label="Tipos de vegetación">
        {allChips.map((chip) => {
          const isSelected = selectedType === chip.code;

          return (
            <button
              key={chip.code}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => onSelectType(chip.code)}
              title={typeof chip.count === 'number' ? `${chip.label}: ${chip.count} ${chip.count === 1 ? 'ejemplar censado' : 'ejemplares censados'} en campus` : chip.label}
              className={cn(
                'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs transition-all duration-150 select-none border focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-2',
                isSelected
                  ? 'bg-forest-800 text-white border-forest-800 font-semibold shadow-xs'
                  : 'bg-neutral-0 text-neutral-700 border-neutral-200 font-medium hover:bg-neutral-100 hover:text-neutral-900 hover:border-neutral-300'
              )}
            >
              <span>{chip.label}</span>
              {typeof chip.count === 'number' && (
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded-full text-[10px] font-semibold',
                    isSelected
                      ? 'bg-forest-700 text-white'
                      : 'bg-neutral-100 text-neutral-600'
                  )}
                >
                  {chip.count}
                </span>
              )}
            </button>
          );
        })}
        </div>
      </div>
    </div>
  );
}
