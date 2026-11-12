package pe.edu.pucp.hesperides.modules.reports.service;

import pe.edu.pucp.hesperides.modules.reports.dto.DirectionReportResponse;
import pe.edu.pucp.hesperides.modules.reports.dto.MonthlyReportFilter;
import pe.edu.pucp.hesperides.modules.reports.dto.MonthlyReportResponse;
import pe.edu.pucp.hesperides.modules.reports.dto.ReportOptionsResponse;
import pe.edu.pucp.hesperides.modules.reports.dto.ReportSectionResponse;
import pe.edu.pucp.hesperides.modules.reports.dto.WeeklyReportResponse;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

/** Facade of the read-only reports module (SPEC-202): resolves the scope and delegates to each builder. */
public interface ReportsService {

    ReportOptionsResponse options(String email);

    List<ReportSectionResponse> sections(Long sectorId, String email);

    MonthlyReportResponse monthly(MonthlyReportFilter filter, String email);

    /** {@code weekStart} null means the current week. */
    WeeklyReportResponse weekly(LocalDate weekStart, Long sectorId, String email);

    /** {@code month} null means the last closed month. */
    DirectionReportResponse direction(YearMonth month, String email);
}
