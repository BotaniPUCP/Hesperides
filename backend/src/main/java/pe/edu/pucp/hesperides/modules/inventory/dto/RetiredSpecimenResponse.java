package pe.edu.pucp.hesperides.modules.inventory.dto;

import java.time.Instant;

/**
 * Trazabilidad de un ejemplar botánico dado de baja lógicamente en el catastro verde.
 * Cruza la información del ejemplar retirado con el registro auditable de audit_log
 * (acción GREEN_ELEMENT_SOFT_DELETED).
 */
public record RetiredSpecimenResponse(
        Long id,
        String code,
        String scientificName,
        String commonName,
        String speciesSlug,
        String vegetationType,
        String sourceLocation,
        String sourceReference,
        String notes,
        Double latitude,
        Double longitude,
        Instant retiredAt,
        String reason,
        String retiredByName,
        String retiredByEmail,
        int interventionsCount
) {
}
