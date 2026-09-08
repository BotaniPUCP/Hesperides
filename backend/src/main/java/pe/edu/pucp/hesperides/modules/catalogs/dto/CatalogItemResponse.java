package pe.edu.pucp.hesperides.modules.catalogs.dto;

/**
 * Vista pública de un ítem de catálogo configurable en el endpoint de consumo
 * de SPEC-003 §4. `metadata` es la JSONB de catalog_items; esta entrega no
 * crea ítems con metadata, así que llega siempre null hasta el spec de
 * administración de catálogos.
 */
public record CatalogItemResponse(Long id, String code, String label, int sortOrder, String metadata) {
}