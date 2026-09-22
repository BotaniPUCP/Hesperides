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
                results.stream().map(ComplianceResponse.Segment::from).toList());
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
