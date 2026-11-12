package pe.edu.pucp.hesperides.modules.maintenance.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.engine.frequency.ComplianceResult;
import pe.edu.pucp.hesperides.engine.frequency.FrequencyEvaluator;
import pe.edu.pucp.hesperides.engine.frequency.FrequencyRule;
import pe.edu.pucp.hesperides.modules.maintenance.dto.ComplianceResponse;
import pe.edu.pucp.hesperides.modules.maintenance.entity.MaintenanceFrequency;
import pe.edu.pucp.hesperides.modules.maintenance.repository.GreenAreaSetLookup;
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
    private final GreenAreaSetLookup sets;

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
        Map<Long, List<MaintenanceFrequency>> inHouseByActivity = new LinkedHashMap<>();
        for (MaintenanceFrequency f : current) {
            if (executionHistory.supportsLocationHistory() && "IN_HOUSE".equals(f.getRegime())) {
                inHouseByActivity.computeIfAbsent(f.getActivityTypeItem().getId(), k -> new ArrayList<>()).add(f);
            } else {
                out.add(evaluateOne(f, from, to));
            }
        }
        inHouseByActivity.values().forEach(rules -> out.add(evaluateLocations(rules, from, to)));
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
                .filter(f -> java.util.Objects.equals(currentVersion.getRuleKey(), f.getRuleKey()))
                .map(MaintenanceFrequency::toRule)
                .toList();
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
                results.stream().map(ComplianceResponse.Segment::from).toList(),
                currentVersion.getScope());
    }

    /** Una respuesta por actividad: cada jardín, juzgado con su regla efectiva (SPEC-203 §5.8). */
    private ComplianceResponse evaluateLocations(List<MaintenanceFrequency> rules, LocalDate from, LocalDate to) {
        MaintenanceFrequency shown = rules.stream().filter(f -> "CAMPUS_WIDE".equals(f.getScope())).findFirst()
                .orElse(rules.get(0));
        Long activityId = shown.getActivityTypeItem().getId();
        List<LocationExecution> facts = executionHistory.locationExecutions(activityId, shown.getRegime(), from, to);
        var zones = facts.stream().map(LocationExecution::zoneId).filter(java.util.Objects::nonNull).toList();
        var places = facts.stream().map(LocationExecution::placeId).filter(java.util.Objects::nonNull).toList();
        var inputs = new LocationComplianceGrouper.Inputs(rules,
                frequenciesRepository.findVersionsOverlapping(activityId, from, to), facts,
                sets.assignedRulesByZone(activityId, zones), sets.sectionsOfPlaces(places));
        var summary = ComplianceResult.notApplicable(shown.getId(), from, to, null,
                "El cumplimiento se evalúa por lugar atendido, sin inferir cobertura de todo el campus");
        return new ComplianceResponse(activityId, shown.getActivityTypeItem().getLabel(), shown.getRegime(),
                shown.getFrequencyRuleTypeItem().getCode(), from, to, List.of(ComplianceResponse.Segment.from(summary)),
                LocationComplianceGrouper.evaluate(inputs, from, to), shown.getScope());
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
