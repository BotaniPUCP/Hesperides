package pe.edu.pucp.hesperides.modules.reports.controller;

import pe.edu.pucp.hesperides.engine.reporting.DateRange;
import pe.edu.pucp.hesperides.engine.reporting.ReportPeriods;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.regex.Pattern;

/**
 * Shape of the report parameters (SPEC-202 §3.6 "Errores"): a malformed or
 * incoherent request is a 400. Rules that depend on the data or the clock live
 * in the service.
 */
final class ReportParams {

    private static final Pattern MONTH = Pattern.compile("\\d{4}-\\d{2}");

    private ReportParams() {
    }

    /** Both dates or none, in order, and at most 366 days (§3.4). */
    static void checkPeriodShape(LocalDate from, LocalDate to) {
        if ((from == null) != (to == null)) {
            throw new ValidationException("Envía ambas fechas del periodo o ninguna");
        }
        if (from == null) {
            return;
        }
        if (to.isBefore(from)) {
            throw new ValidationException("La fecha final no puede ser anterior a la inicial");
        }
        if (ReportPeriods.exceedsMaxRange(new DateRange(from, to))) {
            throw new ValidationException("El periodo no puede superar " + ReportPeriods.MAX_RANGE_DAYS + " días");
        }
    }

    /** {@code YYYY-MM} or nothing (§3.5); null means the default month. */
    static YearMonth month(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        if (!MONTH.matcher(raw).matches()) {
            throw new ValidationException("El mes debe tener el formato AAAA-MM");
        }
        try {
            return YearMonth.parse(raw);
        } catch (DateTimeParseException ex) {
            throw new ValidationException("El mes debe tener el formato AAAA-MM");
        }
    }
}
