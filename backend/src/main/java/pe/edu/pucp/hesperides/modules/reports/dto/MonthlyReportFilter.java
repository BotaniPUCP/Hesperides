package pe.edu.pucp.hesperides.modules.reports.dto;

import java.time.LocalDate;

/** Query parameters of the monthly report (SPEC-202 §3.4); all optional and combined with AND. */
public record MonthlyReportFilter(
        LocalDate dateFrom,
        LocalDate dateTo,
        Long sectorId,
        Long sectionId,
        Long teamId,
        Long classItemId,
        Long typeItemId
) {
}
