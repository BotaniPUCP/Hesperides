package pe.edu.pucp.hesperides.modules.inventory.repository;

import java.math.BigDecimal;

/** Un ejemplar tal como sale de la base. */
public record SpecimenRow(String code, String sourceReference, String sourceLocation, String legacyCode,
                          Double latitude, Double longitude, String photoUrl, int quantity, String notes,
                          BigDecimal heightM, BigDecimal trunkHeightM, BigDecimal dbhCm, BigDecimal crownRadiusM,
                          Boolean isBanded, String dataSource, String elementTypeCode, String elementTypeName,
                          String speciesSlug, Long attachmentId) {
}
