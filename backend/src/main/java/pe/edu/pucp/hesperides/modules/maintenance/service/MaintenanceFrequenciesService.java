package pe.edu.pucp.hesperides.modules.maintenance.service;

import pe.edu.pucp.hesperides.modules.maintenance.dto.CreateMaintenanceFrequencyRequest;
import pe.edu.pucp.hesperides.modules.maintenance.dto.MaintenanceFrequencyResponse;
import pe.edu.pucp.hesperides.modules.maintenance.dto.UpdateMaintenanceFrequencyRequest;

import java.util.List;

public interface MaintenanceFrequenciesService {

    List<MaintenanceFrequencyResponse> findAll(String regime, Long activityTypeItemId, Boolean active);

    MaintenanceFrequencyResponse findById(Long id);

    MaintenanceFrequencyResponse create(CreateMaintenanceFrequencyRequest request);

    MaintenanceFrequencyResponse update(Long id, UpdateMaintenanceFrequencyRequest request);

    void delete(Long id);

    List<MaintenanceFrequencyResponse.ActivityTypeSummary> getAvailableActivityTypes();

    List<MaintenanceFrequencyResponse.FrequencyRuleTypeSummary> getFrequencyRuleTypes();
}
