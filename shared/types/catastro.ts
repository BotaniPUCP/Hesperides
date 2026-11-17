/**
 * Registro del catastro (SPEC-103): formulario, carga por CSV y evaluaciones.
 * Reflejan los DTO de modules/imports del backend.
 */

export interface MeasurementForm {
  /** ISO, AAAA-MM-DD. Decide cuál medición es la vigente. */
  date: string;
  heightM?: number | null;
  trunkHeightM?: number | null;
  dbhCm?: number | null;
  crownRadiusM?: number | null;
  banded?: boolean | null;
  extraValues?: { code: string; value: number }[];
}

/** Nulo en un campo es «no se evaluó», distinto de «no». */
export interface AssessmentForm {
  date: string;
  hasDisease?: boolean | null;
  hasPests?: boolean | null;
  hasMechanicalDamage?: boolean | null;
  isLeaning?: boolean | null;
  hasDeadBranches?: boolean | null;
  hasCavitiesOrRot?: boolean | null;
  hasExposedRoots?: boolean | null;
  interferesWithInfrastructure?: boolean | null;
  recommendedManagement?: string | null;
  observation?: string | null;
}

export interface SpecimenForm {
  scientificName: string;
  lat: number;
  lon: number;
  quantity?: number | null;
  sourceReference?: string | null;
  legacyCode?: string | null;
  sourceLocation?: string | null;
  measurement?: MeasurementForm | null;
  assessment?: AssessmentForm | null;
  notes?: string | null;
}

export interface Assessment extends Required<Omit<AssessmentForm, 'date'>> {
  id: number;
  date: string;
  assessedBy: string | null;
}

/** El 409 del formulario: la planta podría ser otra ya registrada. */
export interface DuplicateMatch {
  duplicateOf: string;
  distanceM: number;
}

export interface ImportIssue {
  /** Línea del archivo; la 1 es la cabecera. */
  line: number;
  column: string;
  message: string;
}

export interface ImportPreview {
  batchId: number;
  kind: string;
  totalRows: number;
  toCreate: number;
  toUpdate: number;
  unknownSpecies: { name: string; rows: number; sourceKey?: string; reason?: string }[];
  /** `label`: la especie o el lugar. `speciesSlug` solo viene en ejemplares. */
  duplicates: { line: number; label: string; speciesSlug: string | null; duplicateOf: string; distanceM: number }[];
  issues: ImportIssue[];
  /** El archivo usó coma decimal: se aceptó, pero el estándar es punto. */
  decimalComma: boolean;
  canConfirm: boolean;
  expiresAt: string;
  /** Hash of the exact backend preview report; confirmation summaries are bound to it. */
  planFingerprint?: string;
  /** Fotos de especie: cuántas tiene hoy cada especie y cuántas quedarán (SPEC-104). Vacío en las demás cargas. */
  photoSets: { species: string; current: number; incoming: number }[];
  /** Identidad que usará cada grupo de nombres fuente en una importación de ejemplares. */
  speciesBindings?: SpeciesImportBinding[];
  /** Cambio de especie propuesto para ejemplares existentes. */
  speciesChanges?: { code: string; previousScientificName: string | null; nextScientificName: string }[];
  /** Inactive exported rows are omitted: CSV never edits or reactivates them. */
  skippedInactiveSpecies?: { line: number; scientificName: string }[];
}

/** Server-calculated counts tied to the saved specimen plan and duplicate decisions. */
export interface ImportConfirmationSummary {
  batchId: number;
  toCreate: number;
  toUpdate: number;
  fingerprint: string;
}

export interface SpeciesImportBinding {
  sourceKey: string;
  sourceName: string;
  rows: number;
  speciesSlug: string;
  scientificName: string;
  active: boolean;
  resolution: 'SCIENTIFIC_NAME' | 'ALTERNATIVE_NAME' | 'USER_SELECTED';
}

/** Opciones de Catálogo Botánico para asociar un nombre del CSV al importar ejemplares. */
export interface SpeciesImportOption {
  slug: string;
  scientificName: string;
  commonName: string | null;
  vegetationTypeName: string;
  active: boolean;
}

export interface ImportResult {
  batchId: number;
  created: number;
  updated: number;
  omittedDuplicates: number;
  unknownSpecies: { name: string; rows: number }[];
  photoWarnings: ImportIssue[];
  createdCodes: string[];
  omittedInactiveSpecies?: number;
}

/** Los estándares de carga por CSV (SPEC-103 §6): el `kind` de la URL. */
export type ImportKind = 'specimens' | 'waste-bins' | 'drinking-fountains' | 'species-photos' | 'species';

/** Un tacho o bebedero del formulario. Las listas van por etiqueta o código del catálogo. */
export interface FeatureForm {
  kind: 'waste-bins' | 'drinking-fountains';
  lat: number;
  lon: number;
  place?: string | null;
  wasteStreams?: string[];
  action?: string | null;
  recommendations?: string | null;
  fountainKind?: string | null;
  fountainStatus?: string | null;
  sector?: string | null;
  note?: string | null;
}
