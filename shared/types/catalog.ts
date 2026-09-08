export interface CatalogType {
  id: number;
  code: string;
  name: string;
  description?: string;
  isSystem: boolean;
}

export interface CatalogItem {
  id: number;
  code: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Forma de cada ítem de ApiResponse.data en GET /api/v1/catalogs/{typeCode}/items
 * (SPEC-003 §4), el endpoint de consumo para desplegables: id, code, label,
 * sortOrder y metadata (JSONB, null cuando no existe). Incluye lo que el
 * frontend necesita para poblar un Select; la administración de catálogos usa
 * CatalogItem completo.
 */
export interface CatalogItemSummary {
  id: number;
  code: string;
  label: string;
  sortOrder: number;
  metadata?: Record<string, unknown> | null;
}
