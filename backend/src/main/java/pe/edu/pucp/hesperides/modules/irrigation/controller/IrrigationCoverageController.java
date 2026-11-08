package pe.edu.pucp.hesperides.modules.irrigation.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.pucp.hesperides.modules.irrigation.dto.IrrigationCoverageResponse;
import pe.edu.pucp.hesperides.modules.irrigation.service.IrrigationCoverageService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;

import static pe.edu.pucp.hesperides.shared.security.RoleCodes.ADMIN;
import static pe.edu.pucp.hesperides.shared.security.RoleCodes.COORDINADOR;
import static pe.edu.pucp.hesperides.shared.security.RoleCodes.SUPERVISOR;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/irrigation/coverage")
public class IrrigationCoverageController {
    private final IrrigationCoverageService service;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('" + ADMIN + "', '" + COORDINADOR + "', '" + SUPERVISOR + "')")
    public ResponseEntity<ApiResponse<IrrigationCoverageResponse>> currentMonth() {
        return ResponseEntity.ok(ApiResponse.ok("Cobertura de riego registrada en el mes", service.currentMonth()));
    }
}
