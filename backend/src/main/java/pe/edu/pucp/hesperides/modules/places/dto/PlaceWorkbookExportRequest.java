package pe.edu.pucp.hesperides.modules.places.dto;

import java.time.LocalDate;
import java.util.List;

public record PlaceWorkbookExportRequest(
        String categoryCode,
        String alias,
        String parentCode,
        LocalDate createdFrom,
        LocalDate createdTo,
        Double point1Lat,
        Double point1Lon,
        Double point2Lat,
        Double point2Lon,
        Double point3Lat,
        Double point3Lon,
        boolean includePerspectives,
        List<String> perspectiveSides) {
}
