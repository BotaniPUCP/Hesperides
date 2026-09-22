package pe.edu.pucp.hesperides.engine.frequency;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

/**
 * Decide si un mantenimiento se esta cumpliendo.
 *
 * <p>PURO: no importa Spring, JPA ni nada de I/O. Recibe la regla y las fechas
 * de ejecucion, devuelve un veredicto. Quien lo llama se encarga de leer la base
 * de datos; este codigo solo sabe de calendario y aritmetica, y por eso se puede
 * probar entero sin levantar un contenedor.
 *
 * <p>Esta clase solo despacha: cada familia de reglas tiene su evaluador. Ese
 * reparto es la razon por la que el catalogo {@code FREQUENCY_RULE_TYPE} es
 * {@code is_system} — sembrar un codigo nuevo desde la pantalla de catalogos
 * crearia una opcion que ningun evaluador sabe calcular.
 */
public final class FrequencyEvaluator {

    private FrequencyEvaluator() {
    }

    /**
     * Evalua un periodo contra una regla.
     *
     * @param executions fechas de ejecucion conocidas; pueden venir en cualquier
     *                   orden e incluir fechas anteriores al periodo, porque la
     *                   ultima ejecucion previa es la que dice si hoy hay un
     *                   mantenimiento vencido
     */
    public static ComplianceResult evaluate(FrequencyRule rule, List<LocalDate> executions,
                                            LocalDate from, LocalDate to) {
        if (rule == null) {
            return ComplianceResult.notConfigured(from, to);
        }

        List<LocalDate> ordered = executions == null ? List.of()
                : executions.stream().filter(Objects::nonNull).sorted().toList();

        return switch (rule.ruleTypeCode()) {
            case "INTERVAL_DAYS", "COVERAGE_CYCLE" ->
                    IntervalEvaluator.evaluate(rule, ordered, from, to);
            case "SEASONAL_PERIOD" ->
                    AnnualCountEvaluator.evaluate(rule, ordered, from, to, false);
            case "ANNUAL_WINDOW" ->
                    AnnualCountEvaluator.evaluate(rule, ordered, from, to, true);
            case "ON_DEMAND" -> ComplianceResult.notApplicable(rule.configId(), from, to,
                    ordered.isEmpty() ? null : ordered.get(ordered.size() - 1),
                    "La actividad es reactiva: no tiene periodicidad que cumplir");
            default -> throw new IllegalArgumentException(
                    "No hay evaluador para el tipo de regla '" + rule.ruleTypeCode()
                    + "'. Todo codigo de FREQUENCY_RULE_TYPE debe tener el suyo antes de sembrarse.");
        };
    }

    /**
     * Evalua un periodo que abarca varias versiones de la configuracion.
     *
     * <p>Devuelve un resultado por tramo, cada uno evaluado con la version que
     * regia entonces. <strong>No se promedian:</strong> un promedio entre dos
     * tolerancias distintas no significa nada, y ademas borraria justamente lo
     * que la vigencia temporal protege, que es poder decir con que regla se juzgo
     * cada tramo.
     */
    public static List<ComplianceResult> evaluateAcrossVersions(List<FrequencyRule> versions,
                                                                List<LocalDate> executions,
                                                                LocalDate from, LocalDate to) {
        if (versions == null || versions.isEmpty()) {
            return List.of(ComplianceResult.notConfigured(from, to));
        }

        List<FrequencyRule> vigentes = versions.stream()
                .filter(v -> !v.validFrom().isAfter(to))
                .filter(v -> v.validTo() == null || !v.validTo().isBefore(from))
                .sorted(Comparator.comparing(FrequencyRule::validFrom))
                .toList();

        if (vigentes.isEmpty()) {
            return List.of(ComplianceResult.notConfigured(from, to));
        }

        List<ComplianceResult> out = new ArrayList<>();
        for (FrequencyRule v : vigentes) {
            LocalDate ini = v.validFrom().isBefore(from) ? from : v.validFrom();
            LocalDate fin = (v.validTo() == null || v.validTo().isAfter(to)) ? to : v.validTo();
            if (!ini.isAfter(fin)) {
                out.add(evaluate(v, executions, ini, fin));
            }
        }
        return out;
    }
}
