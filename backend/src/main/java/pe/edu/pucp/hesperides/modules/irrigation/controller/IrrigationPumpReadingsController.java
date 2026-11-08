package pe.edu.pucp.hesperides.modules.irrigation.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.pucp.hesperides.modules.irrigation.dto.CreateIrrigationPumpReadingRequest;
import pe.edu.pucp.hesperides.modules.irrigation.dto.IrrigationPumpReadingResponse;
import pe.edu.pucp.hesperides.modules.irrigation.dto.IrrigationPumpReadingsResponse;
import pe.edu.pucp.hesperides.modules.irrigation.service.IrrigationPumpReadingsService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;

import static pe.edu.pucp.hesperides.shared.security.RoleCodes.ADMIN;
import static pe.edu.pucp.hesperides.shared.security.RoleCodes.COORDINADOR;
import static pe.edu.pucp.hesperides.shared.security.RoleCodes.SUPERVISOR;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/irrigation/pump-readings")
public class IrrigationPumpReadingsController {
    private final IrrigationPumpReadingsService service;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('" + ADMIN + "', '" + COORDINADOR + "', '" + SUPERVISOR + "')")
    public ResponseEntity<ApiResponse<IrrigationPumpReadingsResponse>> findRecent() {
        return ResponseEntity.ok(ApiResponse.ok("Lecturas recientes de bombeo", service.findRecent()));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('" + SUPERVISOR + "')")
    public ResponseEntity<ApiResponse<IrrigationPumpReadingResponse>> create(
            @Valid @RequestBody CreateIrrigationPumpReadingRequest request,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.ok("Lectura de bombeo registrada", service.create(request, user.getUsername())));
    }
}
