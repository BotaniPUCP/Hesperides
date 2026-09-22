package pe.edu.pucp.hesperides.modules.maintenance.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.pucp.hesperides.modules.maintenance.dto.CreateMaintenanceFrequencyRequest;
import pe.edu.pucp.hesperides.modules.maintenance.dto.MaintenanceFrequencyResponse;
import pe.edu.pucp.hesperides.modules.maintenance.dto.UpdateMaintenanceFrequencyRequest;
import pe.edu.pucp.hesperides.modules.maintenance.service.MaintenanceFrequenciesService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;

import java.net.URI;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/maintenance/frequencies")
public class MaintenanceFrequencyController {

    private static final String READERS = "hasAnyAuthority('ADMIN', 'COORDINADOR', 'SUPERVISOR', 'OPERARIO')";
    private static final String MANAGERS = "hasAnyAuthority('ADMIN', 'COORDINADOR')";

    private final MaintenanceFrequenciesService frequenciesService;

    @GetMapping
    @PreAuthorize(READERS)
    public ResponseEntity<ApiResponse<List<MaintenanceFrequencyResponse>>> getAll(
            @RequestParam(required = false) String regime,
            @RequestParam(required = false) Long activityTypeItemId,
            @RequestParam(required = false) Boolean active) {

        List<MaintenanceFrequencyResponse> list = frequenciesService.findAll(regime, activityTypeItemId, active);
        return ResponseEntity.ok(ApiResponse.ok("Frecuencias de mantenimiento obtenidas exitosamente", list));
    }

    @GetMapping("/activity-types")
    @PreAuthorize(READERS)
    public ResponseEntity<ApiResponse<List<MaintenanceFrequencyResponse.ActivityTypeSummary>>> getActivityTypes() {
        return ResponseEntity.ok(ApiResponse.ok("Tipos de actividad obtenidos exitosamente",
                frequenciesService.getAvailableActivityTypes()));
    }

    @GetMapping("/rule-types")
    @PreAuthorize(READERS)
    public ResponseEntity<ApiResponse<List<MaintenanceFrequencyResponse.FrequencyRuleTypeSummary>>> getRuleTypes() {
        return ResponseEntity.ok(ApiResponse.ok("Tipos de regla obtenidos exitosamente",
                frequenciesService.getFrequencyRuleTypes()));
    }

    @GetMapping("/{id}")
    @PreAuthorize(READERS)
    public ResponseEntity<ApiResponse<MaintenanceFrequencyResponse>> getById(@PathVariable Long id) {
        MaintenanceFrequencyResponse res = frequenciesService.findById(id);
        return ResponseEntity.ok(ApiResponse.ok("Frecuencia de mantenimiento obtenida exitosamente", res));
    }

    @PostMapping
    @PreAuthorize(MANAGERS)
    public ResponseEntity<ApiResponse<MaintenanceFrequencyResponse>> create(
            @Valid @RequestBody CreateMaintenanceFrequencyRequest request) {

        MaintenanceFrequencyResponse created = frequenciesService.create(request);
        return ResponseEntity.created(URI.create("/api/v1/maintenance/frequencies/" + created.id()))
                .body(ApiResponse.ok("Frecuencia de mantenimiento creada exitosamente", created));
    }

    @PutMapping("/{id}")
    @PreAuthorize(MANAGERS)
    public ResponseEntity<ApiResponse<MaintenanceFrequencyResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateMaintenanceFrequencyRequest request) {

        MaintenanceFrequencyResponse updated = frequenciesService.update(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Frecuencia de mantenimiento actualizada exitosamente", updated));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(MANAGERS)
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        frequenciesService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
