package pe.edu.pucp.hesperides.modules.reports.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.pucp.hesperides.modules.reports.dto.ReportOptionsResponse;
import pe.edu.pucp.hesperides.modules.reports.dto.ReportSectionResponse;
import pe.edu.pucp.hesperides.modules.reports.service.ReportsService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;

import java.util.List;

/**
 * Reports (SPEC-202). Permissions are declared here explicitly (D-07): ADMIN is
 * listed by name instead of relying on a global ADMIN ⊃ COORDINADOR mapping.
 * OPERARIO receives 403 on every route.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/reports")
public class ReportsController {

    private static final String READERS = "hasAnyAuthority('ADMIN', 'COORDINADOR', 'SUPERVISOR')";

    private final ReportsService service;

    @GetMapping("/options")
    @PreAuthorize(READERS)
    public ResponseEntity<ApiResponse<ReportOptionsResponse>> options(@AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok("Opciones de reportes", service.options(user.getUsername())));
    }

    @GetMapping("/options/sections")
    @PreAuthorize(READERS)
    public ResponseEntity<ApiResponse<List<ReportSectionResponse>>> sections(
            @RequestParam Long sectorId, @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok("Secciones del sector", service.sections(sectorId, user.getUsername())));
    }
}
