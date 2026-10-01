/**
 * Inventario verde: especies del catastro y sus ejemplares, tal como los
 * entrega /api/v1/green-inventory (docs/inventario-verde/README.md).
 */

/** Un tipo de vegetación del catálogo SPECIES_TYPE con su número de ejemplares. */
export interface VegetationType {
  code: string;
  label: string;
  count: number;
}

export interface InventorySummary {
  totalSpecies: number;
  totalSpecimens: number;
  /** Los nueve tipos, aunque alguno tenga cero ejemplares. */
  vegetationTypes: VegetationType[];
}

/** Una especie. `slug` la identifica en la dirección de su ficha. */
export interface Species {
  slug: string;
  scientificName: string;
  commonName: string;
  /** Otros nombres coloquiales («Palmera bruja»). */
  otherNames: string[];
  family: string | null;
  vegetationTypeCode: string;
  vegetationTypeName: string;
  specimenCount: number;
  /** Miniatura de la foto de uno de sus ejemplares. */
  imageUrl: string | null;
}

/**
 * Un ejemplar en un listado. `code` es el código propio (EV-000123);
 * `sourceReference` y `sourceLocation`, los de la fuente (el catastro).
 */
export interface Specimen {
  code: string;
  sourceReference: string | null;
  sourceLocation: string | null;
  latitude: number | null;
  longitude: number | null;
  /** Enlace original de la foto (Drive). */
  photoUrl: string | null;
  /** Miniatura que se puede mostrar como imagen. */
  thumbnailUrl: string | null;
  /** Mayor que 1 en una agrupación (una mata de Pita). */
  quantity: number;
  notes: string | null;
}

/** Procedencia de las medidas (C-08). Solo MEASURED vale para decidir quién poda. */
export type MeasurementSource = 'MEASURED' | 'GENERIC' | 'UNKNOWN';

export interface SpecimenDetail extends Specimen {
  legacyCode: string | null;
  elementTypeCode: string;
  elementTypeName: string;
  heightM: number | null;
  trunkHeightM: number | null;
  dbhCm: number | null;
  crownRadiusM: number | null;
  isBanded: boolean | null;
  dataSource: MeasurementSource;
  /** Calculada por posición; nula si el ejemplar está fuera de toda sección. */
  section: { code: string; name: string } | null;
  species: Species;
}

export interface LocationCount {
  location: string;
  count: number;
}

export interface SpeciesFilters {
  search?: string;
  vegetationType?: string;
}

export type SpecimenSortKey = 'reference' | 'code' | 'location';

export interface SpecimenFilters {
  search?: string;
  location?: string;
  sortBy?: SpecimenSortKey;
  sortDirection?: 'asc' | 'desc';
}

export type SpecimenViewMode = 'cards' | 'table';
