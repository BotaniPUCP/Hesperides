package pe.edu.pucp.hesperides.modules.reports.dto;

import java.math.BigDecimal;

/** A section of a sector with its area (SPEC-202 §3.2). The area is null when the map lacks it. */
public record ReportSectionResponse(Long id, String code, String name, BigDecimal areaM2) {
}
