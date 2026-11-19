package pe.edu.pucp.hesperides.modules.places.dto;

import java.time.LocalDate;

public record PlaceWorkbookExportRequest(
        String categoryCode,
        String alias,
        String parentCode,
        LocalDate createdFrom,
        LocalDate createdTo,
        boolean includePerspectives) {
}
