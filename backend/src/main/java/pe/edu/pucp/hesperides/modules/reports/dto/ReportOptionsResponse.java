package pe.edu.pucp.hesperides.modules.reports.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * Filter values and default periods visible to the reader (SPEC-202 §3.1).
 * {@code directionMonth} travels as {@code YYYY-MM}.
 */
public record ReportOptionsResponse(
        String timeZone,
        Defaults defaults,
        List<SectorOption> sectors,
        List<TeamOption> teams,
        List<ClassOption> classes
) {
    public record Defaults(LocalDate weekStart, Period monthly, String directionMonth) {
    }

    public record Period(LocalDate dateFrom, LocalDate dateTo) {
    }

    public record SectorOption(Long id, String code, String name) {
    }

    public record TeamOption(Long id, String code, String name, Long sectorId) {
    }

    public record ClassOption(Long id, String code, String label, List<TypeOption> types) {
    }

    public record TypeOption(Long id, String code, String label) {
    }
}
