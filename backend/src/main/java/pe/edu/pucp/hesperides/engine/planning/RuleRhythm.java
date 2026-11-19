package pe.edu.pucp.hesperides.engine.planning;

import pe.edu.pucp.hesperides.engine.frequency.FrequencyRule;

import java.time.LocalDate;
import java.util.Map;

/** Cada cuánto toca según la regla, con la estación del día de referencia. */
final class RuleRhythm {

    private static final Map<String, String> SEASON_LABELS = Map.of(
            "VERANO", "Verano", "OTONO", "Otoño", "INVIERNO", "Invierno", "PRIMAVERA", "Primavera");

    private RuleRhythm() {
    }

    static Rhythm of(FrequencyRule rule, LocalDate at) {
        return switch (rule.ruleTypeCode()) {
            case "INTERVAL_DAYS" -> {
                var iv = rule.intervaloEn(at);
                yield new Rhythm(iv.min(), iv.max(), iv.season() == null ? null : SEASON_LABELS.get(iv.season()),
                        null, null, null);
            }
            case "COVERAGE_CYCLE" -> new Rhythm(rule.coverageTargetDays(), rule.coverageTargetDays(), null, null, null, null);
            case "SEASONAL_PERIOD" -> new Rhythm(null, null, null, rule.annualTargetCount(), null, null);
            case "ANNUAL_WINDOW" -> new Rhythm(null, null, null, rule.annualTargetCount(),
                    rule.seasonStartMonth(), rule.seasonEndMonth());
            default -> null;
        };
    }
}
