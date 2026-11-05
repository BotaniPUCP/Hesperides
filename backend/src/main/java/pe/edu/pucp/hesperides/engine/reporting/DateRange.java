package pe.edu.pucp.hesperides.engine.reporting;

import java.time.LocalDate;

/** An inclusive range of civil dates in the configured zone. */
public record DateRange(LocalDate from, LocalDate to) {
}
