import type { AuditFields } from './models';

/**
 * Representa un tipo de vegetación (formas biológicas) proveniente del catálogo SPECIES_TYPE.
 */
export interface VegetationType {
  code: string;
  label: string;
  count?: number;
}

/**
 * Representa una especie botánica en el catálogo.
 * Alineado con la entidad `species` de SPEC-002.
 */
export interface Species {
  id: number;
  scientificName: string;
  commonName: string;
  vegetationTypeCode: string;
  vegetationTypeName: string;
  specimenCount: number;
  imageUrl?: string | null;
  family?: string | null;
  description?: string | null;
}

/**
 * Representa un ejemplar individual de vegetación en el campus.
 * Alineado con la entidad `green_elements` de SPEC-002.
 */
export interface Specimen {
  id: number;
  speciesId: number;
  code: string | null;
  reference: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  photoUrl: string | null;
  observations: string | null;
  quantity: number;
  speciesCommonName?: string;
  speciesScientificName?: string;
  vegetationTypeName?: string;
  vegetationTypeCode?: string;
}

/**
 * Filtros para el catálogo de especies.
 */
export interface SpeciesFilters {
  search?: string;
  vegetationType?: string;
}

/**
 * Filtros y ordenamiento para los ejemplares de una especie.
 */
export interface SpecimenFilters {
  search?: string;
  location?: string;
  sortBy?: 'code' | 'location' | 'reference';
  sortDirection?: 'asc' | 'desc';
}

/**
 * Modo de visualización en la pantalla de ejemplares.
 */
export type SpecimenViewMode = 'cards' | 'table';
