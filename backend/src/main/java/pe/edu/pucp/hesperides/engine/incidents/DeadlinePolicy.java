package pe.edu.pucp.hesperides.engine.incidents;

import java.time.Duration;

/**
 * Plazos de atención de una incidencia (SPEC-201 §3.9, catálogo 5.6). Las horas por urgencia
 * son parámetros provisionales del sistema; un tercero se rige por los días que pactó.
 */
public record DeadlinePolicy(long highHours, long mediumHours, long lowHours) {

    public DeadlinePolicy {
        if (highHours <= 0 || mediumHours <= 0 || lowHours <= 0) {
            throw new IllegalArgumentException("Deadline hours must be positive");
        }
    }

    public Duration allowed(String urgencyCode, boolean thirdParty, Integer agreedDays) {
        if (thirdParty) return agreed(agreedDays);
        return Duration.ofHours(hoursFor(urgencyCode));
    }

    private static Duration agreed(Integer agreedDays) {
        if (agreedDays == null || agreedDays <= 0) {
            throw new IllegalArgumentException("Third-party attention needs agreed days");
        }
        return Duration.ofDays(agreedDays);
    }

    private long hoursFor(String urgencyCode) {
        return switch (urgencyCode == null ? "" : urgencyCode) {
            case "HIGH" -> highHours;
            case "MEDIUM" -> mediumHours;
            case "LOW" -> lowHours;
            default -> throw new IllegalArgumentException("Unknown urgency: " + urgencyCode);
        };
    }
}
