package pe.edu.pucp.hesperides.modules.maintenance.dto;

import pe.edu.pucp.hesperides.engine.frequency.ComplianceResult;

import java.time.LocalDate;
import java.util.List;

/**
 * El cumplimiento de una actividad en un periodo.
 *
 * <p>Los tramos vienen separados y no promediados: cuando el periodo abarca dos
 * versiones de la regla, cada uno se evaluo con la suya y mezclarlos borraria
 * justo lo que la vigencia protege.
 */
public record ComplianceResponse(
        Long activityTypeItemId,
        String activityTypeLabel,
        String regime,
        String ruleTypeCode,
        LocalDate from,
        LocalDate to,
        List<Segment> segments
) {
    /**
     * @param evaluatedWithConfigId la version que se uso. Es lo que permite
     *        responder "por que este mes salio asi" sin reconstruir el estado
     *        de la tabla en esa fecha.
     */
    public record Segment(
            String status,
            Long evaluatedWithConfigId,
            Integer observedValue,
            Integer expectedValue,
            Integer toleranceLimit,
            LocalDate lastExecutionDate,
            LocalDate periodStart,
            LocalDate periodEnd,
            String season,
            boolean prorated,
            int outOfSeason,
            String explanation
    ) {
        public static Segment from(ComplianceResult r) {
            return new Segment(
                    r.status().name(),
                    r.evaluatedWithConfigId(),
                    r.observedValue(),
                    r.expectedValue(),
                    r.toleranceLimit(),
                    r.lastExecutionDate(),
                    r.periodStart(),
                    r.periodEnd(),
                    r.season(),
                    r.prorated(),
                    r.outOfSeason(),
                    r.explanation());
        }
    }
}
