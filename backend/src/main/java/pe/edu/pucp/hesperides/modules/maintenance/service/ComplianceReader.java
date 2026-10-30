package pe.edu.pucp.hesperides.modules.maintenance.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.engine.frequency.ComplianceResult;
import pe.edu.pucp.hesperides.engine.frequency.FrequencyEvaluator;
import pe.edu.pucp.hesperides.engine.frequency.FrequencyRule;
import pe.edu.pucp.hesperides.modules.maintenance.dto.ComplianceResponse;
import pe.edu.pucp.hesperides.modules.maintenance.entity.MaintenanceFrequency;
import pe.edu.pucp.hesperides.modules.maintenance.repository.MaintenanceFrequenciesRepository;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Arma el reporte de cumplimiento: lee la base, delega el juicio al Engine.
 *
 * <p>Separado del servicio de CRUD porque son dos responsabilidades distintas:
 * uno configura reglas, el otro las aplica al historial. Aqui no hay ninguna
 * decision de negocio; toda comparacion vive en el Engine, que se puede probar
 * sin base de datos.
 */
@Service
@RequiredArgsConstructor
public class ComplianceReader {

    private final MaintenanceFrequenciesRepository frequenciesRepository;
    private final ExecutionHistoryProvider executionHistory;

    @Transactional(readOnly = true)
    public List<ComplianceResponse> evaluate(LocalDate from, LocalDate to, Long activityTypeItemId) {
        if (from == null || to == null) {
            throw new BusinessRuleException("El periodo a evaluar requiere fecha de inicio y de fin");
        }
        if (to.isBefore(from)) {
            throw new BusinessRuleException("La fecha de fin no puede ser anterior a la de inicio");
        }

        List<MaintenanceFrequency> current = activityTypeItemId != null
                ? frequenciesRepository.searchCurrent(null, activityTypeItemId, true)
                : frequenciesRepository.findAllCurrent();

        List<ComplianceResponse> out = new ArrayList<>();
        for (MaintenanceFrequency f : current) {
            out.add(evaluateOne(f, from, to));
        }
        return out;
    }

    private ComplianceResponse evaluateOne(MaintenanceFrequency currentVersion,
                                           LocalDate from, LocalDate to) {
        Long activityId = currentVersion.getActivityTypeItem().getId();
        String regime = currentVersion.getRegime();

        // Todas las versiones que solapan el periodo, no solo la vigente: cada
        // tramo se juzga con la regla que regia entonces.
        List<FrequencyRule> versions = frequenciesRepository
                .findVersionsOverlapping(activityId, from, to)
                .stream()
                .filter(f -> regime.equals(f.getRegime()))
                .filter(f -> java.util.Objects.equals(currentVersion.getScope(),f.getScope())
                        && java.util.Objects.equals(currentVersion.getZoneId(),f.getZoneId()))
                .map(MaintenanceFrequency::toRule)
                .toList();

        if (executionHistory.supportsLocationHistory() && "IN_HOUSE".equals(regime)) {
            return evaluateLocations(currentVersion, versions, from, to);
        }
        List<LocalDate> executions = executionHistory.executionDates(activityId, regime, from, to);

        List<ComplianceResult> results = versions.isEmpty()
                ? List.of(ComplianceResult.notConfigured(from, to))
                : FrequencyEvaluator.evaluateAcrossVersions(versions, executions, from, to);

        return new ComplianceResponse(
                activityId,
                currentVersion.getActivityTypeItem().getLabel(),
                regime,
                currentVersion.getFrequencyRuleTypeItem().getCode(),
                from,
                to,
                results.stream().map(ComplianceResponse.Segment::from).toList());
    }

    private ComplianceResponse evaluateLocations(MaintenanceFrequency frequency, List<FrequencyRule> versions,
            LocalDate from, LocalDate to) {
        var groups = new LinkedHashMap<String,List<LocationExecution>>();
        for (var fact : executionHistory.locationExecutions(frequency.getActivityTypeItem().getId(),frequency.getRegime(),from,to)) {
            if ("BY_SECTOR".equals(frequency.getScope())) continue;
            if ("BY_ZONE".equals(frequency.getScope()) && !java.util.Objects.equals(frequency.getZoneId(),fact.zoneId())) continue;
            groups.computeIfAbsent(fact.targetKind()+":"+fact.targetId(),key -> new ArrayList<>()).add(fact);
        }
        var locations = new ArrayList<ComplianceResponse.LocationCompliance>();
        for (var facts : groups.values()) {
            var first = facts.get(0);
            // One activity in the same target may contain several execution units.
            // Count it once, at the last physical completion there; distinct works
            // on the same date remain distinct occurrences.
            var byWork = new LinkedHashMap<Long,LocalDate>();
            for (var fact : facts) byWork.merge(fact.interventionId(),fact.executionDate(),(a,b) -> a.isAfter(b)?a:b);
            List<ComplianceResult> results;
            if ("BY_SECTOR".equals(frequency.getScope()) || "LOCATION".equals(first.targetKind())) {
                results = List.of(ComplianceResult.notApplicable(frequency.getId(),from,to,null,
                        "La evaluación requiere una referencia estable de lugar/sección y alcance territorial confirmado"));
            } else results = versions.isEmpty() ? List.of(ComplianceResult.notConfigured(from,to))
                    : FrequencyEvaluator.evaluateAcrossVersions(versions,new ArrayList<>(byWork.values()),from,to);
            locations.add(new ComplianceResponse.LocationCompliance(first.targetKind(),first.targetId(),first.targetLabel(),facts,
                    results.stream().map(ComplianceResponse.Segment::from).toList()));
        }
        var summary = ComplianceResult.notApplicable(frequency.getId(),from,to,null,
                "BY_SECTOR".equals(frequency.getScope())
                    ? "La evaluación por sector requiere confirmar su correspondencia territorial histórica"
                    : "El cumplimiento se evalúa por lugar atendido, sin inferir cobertura de todo el campus");
        return new ComplianceResponse(frequency.getActivityTypeItem().getId(),frequency.getActivityTypeItem().getLabel(),
                frequency.getRegime(),frequency.getFrequencyRuleTypeItem().getCode(),from,to,
                List.of(ComplianceResponse.Segment.from(summary)),locations);
    }

    /**
     * Cumplimiento de las actividades que SI tienen frecuencia, indexado por id.
     * Lo consume quien necesite cruzarlo con otra vista sin repetir el calculo.
     */
    @Transactional(readOnly = true)
    public Map<Long, ComplianceResponse> evaluateByActivity(LocalDate from, LocalDate to) {
        Map<Long, ComplianceResponse> byActivity = new LinkedHashMap<>();
        for (ComplianceResponse r : evaluate(from, to, null)) {
            byActivity.put(r.activityTypeItemId(), r);
        }
        return byActivity;
    }
}
