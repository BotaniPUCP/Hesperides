package pe.edu.pucp.hesperides.modules.planning.assignments.controller;

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
import pe.edu.pucp.hesperides.modules.planning.assignments.dto.PlanningAssignmentRequest;
import pe.edu.pucp.hesperides.modules.planning.assignments.dto.PlanningAssignmentResponse;
import pe.edu.pucp.hesperides.modules.planning.assignments.service.PlanningAssignmentsService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;

import java.net.URI;
import java.util.List;
import java.util.UUID;

/** SPEC-203 §3.4: qué frecuencia se planifica en cada conjunto. Solo coordinación planifica (D-12). */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/maintenance/planning/assignments")
@PreAuthorize("hasAnyAuthority('ADMIN', 'COORDINADOR')")
public class PlanningAssignmentsController {

    private final PlanningAssignmentsService service;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PlanningAssignmentResponse>>> list(@RequestParam(required = false) UUID ruleKey) {
        return ResponseEntity.ok(ApiResponse.ok("Asignaciones de frecuencias", service.list(ruleKey)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PlanningAssignmentResponse>> create(@Valid @RequestBody PlanningAssignmentRequest request) {
        PlanningAssignmentResponse created = service.create(request);
        return ResponseEntity.created(URI.create("/api/v1/maintenance/planning/assignments/" + created.id()))
                .body(ApiResponse.ok("Frecuencia asignada", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<PlanningAssignmentResponse>> change(@PathVariable long id,
                                                                          @Valid @RequestBody PlanningAssignmentRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Asignación actualizada", service.change(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable long id) {
        service.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("Asignación quitada", null));
    }
}
