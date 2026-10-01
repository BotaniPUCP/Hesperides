'use client';

import { useMemo, useState, useEffect } from 'react';
import type {
  Species,
  Specimen,
  VegetationType,
  SpeciesFilters,
  SpecimenFilters,
} from '@shared/types';
import {
  MOCK_SPECIES,
  MOCK_SPECIMENS,
  MOCK_VEGETATION_TYPES,
} from '@/lib/mock/inventario-verde-data';

export interface UseInventarioVerdeSpeciesParams extends SpeciesFilters {
  page?: number;
  pageSize?: number;
}

export interface UseInventarioVerdeSpecimensParams extends SpecimenFilters {
  page?: number;
  pageSize?: number;
}

/**
 * Hook para consultar especies del catálogo con filtros y paginación.
 */
export function useInventarioVerdeSpecies(params: UseInventarioVerdeSpeciesParams = {}) {
  const { search = '', vegetationType, page = 0, pageSize = 24 } = params;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simular latencia de red controlada para mostrar LoadingSkeleton adecuadamente
    const timer = setTimeout(() => {
      setLoading(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [search, vegetationType, page, pageSize]);

  const filtered = useMemo(() => {
    let result = [...MOCK_SPECIES];

    if (vegetationType && vegetationType !== 'ALL') {
      result = result.filter((sp) => sp.vegetationTypeCode === vegetationType);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (sp) =>
          sp.commonName.toLowerCase().includes(q) ||
          sp.scientificName.toLowerCase().includes(q) ||
          (sp.family && sp.family.toLowerCase().includes(q))
      );
    }

    return result;
  }, [search, vegetationType]);

  const totalElements = filtered.length;
  const totalPages = Math.ceil(totalElements / pageSize) || 1;
  const currentPage = Math.max(0, Math.min(page, totalPages - 1));

  const paginatedSpecies = useMemo(() => {
    const start = currentPage * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  return {
    species: paginatedSpecies,
    totalElements,
    totalPages,
    currentPage,
    loading,
  };
}

/**
 * Hook para consultar el detalle de una especie individual por su ID.
 */
export function useInventarioVerdeSpeciesById(id: number | string | null | undefined) {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 100);
    return () => clearTimeout(timer);
  }, [numericId]);

  const species = useMemo(() => {
    if (!numericId || isNaN(numericId)) return null;
    return MOCK_SPECIES.find((s) => s.id === numericId) ?? null;
  }, [numericId]);

  return { species, loading };
}

/**
 * Hook para consultar ejemplares pertenecientes a una especie con búsqueda,
 * filtrado por sector/ubicación, ordenamiento y paginación.
 */
export function useInventarioVerdeSpecimens(
  speciesId: number | string | null | undefined,
  params: UseInventarioVerdeSpecimensParams = {}
) {
  const numericId = typeof speciesId === 'string' ? parseInt(speciesId, 10) : speciesId;
  const {
    search = '',
    location = 'ALL',
    sortBy = 'reference',
    sortDirection = 'asc',
    page = 0,
    pageSize = 12,
  } = params;

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 150);
    return () => clearTimeout(timer);
  }, [numericId, search, location, sortBy, sortDirection, page, pageSize]);

  // Lista base de todos los ejemplares de esta especie
  const speciesSpecimens = useMemo(() => {
    if (!numericId || isNaN(numericId)) return [];
    return MOCK_SPECIMENS.filter((spec) => spec.speciesId === numericId);
  }, [numericId]);

  // Extraer las ubicaciones disponibles para esta especie con su respectivo conteo
  const availableLocations = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of speciesSpecimens) {
      if (s.location) {
        map.set(s.location, (map.get(s.location) ?? 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([loc, count]) => ({ location: loc, count }))
      .sort((a, b) => a.location.localeCompare(b.location));
  }, [speciesSpecimens]);

  // Filtrado y ordenamiento
  const filtered = useMemo(() => {
    let result = [...speciesSpecimens];

    if (location && location !== 'ALL') {
      result = result.filter((s) => s.location === location);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (s) =>
          s.reference.toLowerCase().includes(q) ||
          (s.code && s.code.toLowerCase().includes(q)) ||
          s.location.toLowerCase().includes(q) ||
          (s.observations && s.observations.toLowerCase().includes(q))
      );
    }

    // Ordenamiento
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'code') {
        const valA = a.code || a.reference;
        const valB = b.code || b.reference;
        comparison = valA.localeCompare(valB, undefined, { numeric: true });
      } else if (sortBy === 'location') {
        comparison = a.location.localeCompare(b.location);
      } else {
        // Por referencia
        comparison = a.reference.localeCompare(b.reference, undefined, { numeric: true });
      }
      return sortDirection === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [speciesSpecimens, location, search, sortBy, sortDirection]);

  const totalElements = filtered.length;
  const totalPages = Math.ceil(totalElements / pageSize) || 1;
  const currentPage = Math.max(0, Math.min(page, totalPages - 1));

  const paginatedSpecimens = useMemo(() => {
    const start = currentPage * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  return {
    specimens: paginatedSpecimens,
    allFilteredCount: totalElements,
    totalElements,
    totalPages,
    currentPage,
    availableLocations,
    loading,
  };
}

/**
 * Hook para consultar un ejemplar específico por su ID.
 */
export function useInventarioVerdeSpecimenById(specimenId: number | string | null | undefined) {
  const numericId = typeof specimenId === 'string' ? parseInt(specimenId, 10) : specimenId;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 100);
    return () => clearTimeout(timer);
  }, [numericId]);

  const specimen = useMemo(() => {
    if (!numericId || isNaN(numericId)) return null;
    return MOCK_SPECIMENS.find((s) => s.id === numericId) ?? null;
  }, [numericId]);

  const species = useMemo(() => {
    if (!specimen) return null;
    return MOCK_SPECIES.find((sp) => sp.id === specimen.speciesId) ?? null;
  }, [specimen]);

  return { specimen, species, loading };
}

/**
 * Hook para estadísticas y tipos de vegetación.
 */
export function useInventarioVerdeStats() {
  const totalSpecies = MOCK_SPECIES.length;
  const totalSpecimens = MOCK_SPECIMENS.length;
  const vegetationTypes = MOCK_VEGETATION_TYPES;

  return {
    totalSpecies,
    totalSpecimens,
    vegetationTypes,
  };
}
