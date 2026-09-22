package pe.edu.pucp.hesperides.modules.maintenance.service;

import pe.edu.pucp.hesperides.modules.maintenance.dto.ComplianceResponse;
import pe.edu.pucp.hesperides.modules.maintenance.dto.CreateMaintenanceFrequencyRequest;
import pe.edu.pucp.hesperides.modules.maintenance.dto.MaintenanceFrequencyResponse;
import pe.edu.pucp.hesperides.modules.maintenance.dto.UpdateMaintenanceFrequencyRequest;

import java.time.LocalDate;
import java.util.List;

public interface MaintenanceFrequenciesService {

    List<MaintenanceFrequencyResponse> findAll(String regime, Long activityTypeItemId, Boolean active);

    MaintenanceFrequencyResponse findById(Long id);

    /** Todas las versiones de una actividad, incluidas las cerradas. */
    List<MaintenanceFrequencyResponse> findHistory(Long activityTypeItemId, String regime);

    MaintenanceFrequencyResponse create(CreateMaintenanceFrequencyRequest request);

    /** Cierra la version vigente y crea otra; ver UpdateMaintenanceFrequencyRequest. */
    MaintenanceFrequencyResponse update(Long id, UpdateMaintenanceFrequencyRequest request);

    void delete(Long id);

    List<ComplianceResponse> evaluateCompliance(LocalDate from, LocalDate to, Long activityTypeItemId);

    List<MaintenanceFrequencyResponse.ActivityTypeSummary> getAvailableActivityTypes();

    List<MaintenanceFrequencyResponse.FrequencyRuleTypeSummary> getFrequencyRuleTypes();
}
