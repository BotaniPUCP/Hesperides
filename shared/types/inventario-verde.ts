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
  /** Miniatura de la foto principal: la de la especie o, si no tiene, la de uno de sus ejemplares. */
  imageUrl: string | null;
  /** De dónde sale `imageUrl`: decide la etiqueta de la ficha. Nulo si no hay foto. */
  imageSource: 'SPECIES' | 'SPECIMEN' | null;
  /** Las fotos genéricas en su orden (SPEC-104). Solo en la ficha; en el listado viene vacío. */
  photos: SpeciesPhoto[];
}

/** Una foto genérica de especie con su crédito. Autor, licencia y fuente faltan en una foto propia. */
export interface SpeciesPhoto {
  thumbnailUrl: string;
  imageUrl: string;
  author: string | null;
  license: string | null;
  /** La página que acredita la foto (Wikimedia Commons), no la de descarga. */
  sourceUrl: string | null;
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
  /** Enlace de origen de la foto (Drive), como vino del catastro o del CSV. */
  photoUrl: string | null;
  /** La foto para mostrar en grande: la guardada en nuestro almacenamiento si existe. */
  imageUrl: string | null;
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
