package pe.edu.pucp.hesperides.modules.inventory.dto;

import java.math.BigDecimal;

/**
 * La ficha de un ejemplar. Las medidas solo valen si {@code dataSource} es
 * MEASURED (C-08); {@code section} es nula si el ejemplar está fuera de toda sección.
 */
public record SpecimenDetailResponse(String code, String sourceReference, String sourceLocation, String legacyCode,
                                     Double latitude, Double longitude, String photoUrl, String imageUrl,
                                     String thumbnailUrl,
                                     int quantity, String notes, String elementTypeCode, String elementTypeName,
                                     BigDecimal heightM, BigDecimal trunkHeightM, BigDecimal dbhCm,
                                     BigDecimal crownRadiusM, Boolean isBanded, String dataSource,
                                     SectionRef section, SpeciesResponse species) {
}
