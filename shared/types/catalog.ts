/**
 * Espejo de los DTOs de SPEC-003. Cada campo existe en CatalogItemResponse y
 * CatalogTypeResponse del backend: nada aquí es aspiracional.
 *
 * No hay `id` en ninguno de los dos, y no es un olvido. El backend no lo expone
 * (SPEC-003 §4): si mañana se resiembran los catálogos los id cambian y el
 * `code` no, así que el `code` es la única referencia estable que el frontend
 * puede guardar o mandar de vuelta.
 */

export interface CatalogType {
  code: string;
  name: string;
  description?: string;
  isSystem: boolean;
}

export interface CatalogItem {
  code: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  /**
   * Code del ítem padre en catálogos de dos niveles, null en los planos. Es lo
   * que permite encadenar los selectores clase → tipo: el formulario filtra los
   * tipos cuyo parentCode es la clase elegida.
   */
  parentCode: string | null;
  /**
   * Datos que acompañan al ítem: la descripción de ayuda que lee el operario,
   * el grupo responsable de una clase, o `provisional: true` en los tipos que
   * el cliente todavía no ha confirmado.
   */
  metadata?: Record<string, unknown>;
}

/** El tipo con todos sus ítems, activos o no: la vista de administración. */
export interface CatalogTypeDetail extends CatalogType {
  items: CatalogItem[];
}

/** Cuerpo de POST /catalogs/{typeCode}/items. */
export interface CreateCatalogItemRequest {
  code: string;
  label: string;
  sortOrder?: number;
  parentCode?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Cuerpo de PUT /catalogs/{typeCode}/items/{code}. Sin `code`: renombrarlo
 * rompería toda fila que lo referencia y toda decisión que el backend toma
 * comparando ese valor.
 */
export interface UpdateCatalogItemRequest {
  label: string;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
}
