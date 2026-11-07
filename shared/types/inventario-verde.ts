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
  originCode?: string | null;
  originName?: string | null;
  description?: string | null;
  careNotes?: string | null;
  specimenCount: number;
  /** Miniatura de la foto principal: la de la especie o, si no tiene, la de uno de sus ejemplares. */
  imageUrl: string | null;
  /** De dónde sale `imageUrl`: decide la etiqueta de la ficha. Nulo si no hay foto. */
  imageSource: 'SPECIES' | 'SPECIMEN' | null;
  /** Las fotos genéricas en su orden (SPEC-104). Solo en la ficha; en el listado viene vacío. */
  photos: SpeciesPhoto[];
  /** Si la altura de la especie decide cómo se atiende (SPEC-105 D-01). */
  critical: boolean;
  /** Promedios de la especie. Nunca son datos de un ejemplar. */
  referenceHeightM: number | null;
  referenceHeightSourceCode: string | null;
  referenceHeightSourceName: string | null;
  referenceCrownRadiusM: number | null;
  referenceCrownRadiusSourceCode: string | null;
  referenceCrownRadiusSourceName: string | null;
  /** Si fuste y DAP aplican a la especie; si no, los formularios no los piden. */
  usesTrunkHeight: boolean;
  usesDbh: boolean;
  unmeasuredSpecimenCount: number;
}

/** Formulario para registrar o editar una especie botánica del catálogo. */
export interface SpeciesForm {
  scientificName: string;
  commonName?: string;
  family?: string;
  vegetationTypeCode: string;
  originCode?: string;
  otherNames?: string[];
  description?: string;
  careNotes?: string;
  critical?: boolean;
  referenceHeightM?: number | null;
  referenceHeightSourceCode?: string | null;
  referenceCrownRadiusM?: number | null;
  referenceCrownRadiusSourceCode?: string | null;
  usesTrunkHeight?: boolean;
  usesDbh?: boolean;
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
  speciesSlug?: string | null;
  speciesCommonName?: string | null;
  speciesScientificName?: string | null;
}

/** Procedencia de las medidas (C-08). Solo MEASURED vale para decidir quién poda. */
export type MeasurementSource = 'MEASURED' | 'GENERIC' | 'UNKNOWN';

/** Qué se puede mostrar de un ejemplar: su medida real, el promedio de su especie o nada (SPEC-105 §5.4). */
export type MeasurementStatus = 'MEASURED' | 'REFERENCE' | 'NOT_MEASURED';

/** Quién poda (SPEC-105 §5.5). Es una propuesta: nunca bloquea nada. */
export type PruningAssignment = 'STABLE_STAFF' | 'THIRD_PARTY' | 'FIELD_VERIFICATION';

export interface MeasurementRecord {
  id: number;
  date: string;
  heightM: number | null;
  trunkHeightM: number | null;
  dbhCm: number | null;
  crownRadiusM: number | null;
  banded: boolean | null;
  measuredBy: string | null;
  notes?: string | null;
  /** AVERAGE guarda el promedio vigente cuando se aplicó: no es una medida real (SPEC-105 §4.3). */
  origin: 'MEASURED' | 'AVERAGE';
}

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
  measuredAt: string | null;
  speciesCritical: boolean;
  measurementStatus: MeasurementStatus;
  /** Solo con measurementStatus = REFERENCE. */
  referenceHeightM: number | null;
  referenceCrownRadiusM: number | null;
  referenceHeightSourceName: string | null;
  referenceCrownRadiusSourceName: string | null;
  lastPruningDate: string | null;
  measuredBeforeLastPruning: boolean;
  pruningAssignment: PruningAssignment;
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
  vegetationType?: string;
  /** Independientes entre sí; sin valor, no filtran (SPEC-105 §3). */
  critical?: boolean;
  measured?: boolean;
  sortBy?: SpecimenSortKey;
  sortDirection?: 'asc' | 'desc';
}

export type SpecimenViewMode = 'cards' | 'table';

export interface SpecimenSearchResult {
  code: string;
  sourceReference: string | null;
  sourceLocation: string | null;
  legacyCode: string | null;
  speciesSlug: string;
  speciesCommonName: string;
  speciesScientificName: string;
}
