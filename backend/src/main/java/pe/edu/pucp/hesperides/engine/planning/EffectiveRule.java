package pe.edu.pucp.hesperides.engine.planning;

import pe.edu.pucp.hesperides.engine.frequency.FrequencyRule;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.OptionalInt;

/**
 * Qué regla rige a un jardín y cuándo se atendió «hace poco» (SPEC-203 D-08, §5.6).
 * La misma función sirve a la planificación y al reporte mensual, para que ambos
 * juzguen a cada jardín con una sola regla.
 */
public final class EffectiveRule {

    private EffectiveRule() {
    }

    /** La propia de menor mínimo entre los conjuntos del jardín; si no tiene, la de todo el campus. */
    public static FrequencyRule forGarden(List<FrequencyRule> ownRules, FrequencyRule campusWide, LocalDate at) {
        return ownRules.stream().min(Comparator.comparingInt(r -> minDays(r, at))).orElse(campusWide);
    }

    /** El mínimo, si la fecha programada cae antes de última vez + mínimo; la cuota y la ventana no avisan. */
    public static OptionalInt recentMinDays(FrequencyRule rule, LocalDate last, LocalDate scheduled) {
        int min = minDays(rule, last);
        if (min == Integer.MAX_VALUE || !scheduled.isBefore(last.plusDays(min))) {
            return OptionalInt.empty();
        }
        return OptionalInt.of(min);
    }

    private static int minDays(FrequencyRule rule, LocalDate at) {
        Integer min = switch (rule.ruleTypeCode()) {
            case "INTERVAL_DAYS" -> rule.intervaloEn(at).min();
            case "COVERAGE_CYCLE" -> rule.coverageTargetDays();
            default -> null;
        };
        return min == null ? Integer.MAX_VALUE : min;
    }
}
