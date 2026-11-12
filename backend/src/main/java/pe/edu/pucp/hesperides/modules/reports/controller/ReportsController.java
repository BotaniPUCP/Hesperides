package pe.edu.pucp.hesperides.modules.reports.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.pucp.hesperides.modules.reports.dto.DirectionReportResponse;
import pe.edu.pucp.hesperides.modules.reports.dto.MonthlyReportFilter;
import pe.edu.pucp.hesperides.modules.reports.dto.MonthlyReportResponse;
import pe.edu.pucp.hesperides.modules.reports.dto.ReportOptionsResponse;
import pe.edu.pucp.hesperides.modules.reports.dto.ReportSectionResponse;
import pe.edu.pucp.hesperides.modules.reports.dto.WeeklyReportResponse;
import pe.edu.pucp.hesperides.modules.reports.service.ReportsService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;

import java.time.LocalDate;
import java.util.List;

/**
 * Reports (SPEC-202). Permissions are declared here explicitly (D-07): ADMIN is
 * listed by name instead of relying on a global ADMIN ⊃ COORDINADOR mapping.
 * OPERARIO receives 403 on every route and SUPERVISOR on the direction summary.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/reports")
public class ReportsController {

    private static final String READERS = "hasAnyAuthority('ADMIN', 'COORDINADOR', 'SUPERVISOR')";
    private static final String CAMPUS_READERS = "hasAnyAuthority('ADMIN', 'COORDINADOR')";

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

    @GetMapping("/weekly")
    @PreAuthorize(READERS)
    public ResponseEntity<ApiResponse<WeeklyReportResponse>> weekly(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart,
            @RequestParam(required = false) Long sectorId,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok("Reporte semanal",
                service.weekly(weekStart, sectorId, user.getUsername())));
    }

    @GetMapping("/monthly")
    @PreAuthorize(READERS)
    public ResponseEntity<ApiResponse<MonthlyReportResponse>> monthly(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) Long sectorId,
            @RequestParam(required = false) Long sectionId,
            @RequestParam(required = false) Long teamId,
            @RequestParam(required = false) Long classItemId,
            @RequestParam(required = false) Long typeItemId,
            @AuthenticationPrincipal UserDetails user) {
        ReportParams.checkPeriodShape(dateFrom, dateTo);
        var filter = new MonthlyReportFilter(dateFrom, dateTo, sectorId, sectionId, teamId, classItemId, typeItemId);
        return ResponseEntity.ok(ApiResponse.ok("Reporte mensual", service.monthly(filter, user.getUsername())));
    }

    @GetMapping("/direction")
    @PreAuthorize(CAMPUS_READERS)
    public ResponseEntity<ApiResponse<DirectionReportResponse>> direction(
            @RequestParam(required = false) String month, @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok("Resumen para dirección",
                service.direction(ReportParams.month(month), user.getUsername())));
    }
}
