package pe.edu.pucp.hesperides.modules.planning.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.pucp.hesperides.modules.planning.dto.PlanningRowResponse;
import pe.edu.pucp.hesperides.modules.planning.dto.RecentAttentionResponse;
import pe.edu.pucp.hesperides.modules.planning.service.PlanningService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;

import java.time.LocalDate;
import java.util.List;

/** SPEC-203 §3.2 y §3.3: solo coordinación planifica (D-12). */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/maintenance/planning")
@PreAuthorize("hasAnyAuthority('ADMIN', 'COORDINADOR')")
public class PlanningController {

    private final PlanningService service;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PlanningRowResponse>>> rows() {
        return ResponseEntity.ok(ApiResponse.ok("Planificación preventiva", service.rows()));
    }

    @GetMapping("/recent-attention")
    public ResponseEntity<ApiResponse<List<RecentAttentionResponse>>> recentAttention(
            @RequestParam long activityTypeItemId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam List<Long> zoneIds) {
        return ResponseEntity.ok(ApiResponse.ok("Jardines atendidos hace poco",
                service.recentAttention(activityTypeItemId, date, zoneIds)));
    }
}
