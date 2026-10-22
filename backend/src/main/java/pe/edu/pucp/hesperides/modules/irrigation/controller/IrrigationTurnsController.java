package pe.edu.pucp.hesperides.modules.irrigation.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import pe.edu.pucp.hesperides.modules.irrigation.dto.*;
import pe.edu.pucp.hesperides.modules.irrigation.service.IrrigationTurnsService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;

import java.net.URI;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/irrigation")
public class IrrigationTurnsController {
    private static final String READERS = "hasAnyAuthority('ADMIN', 'COORDINADOR', 'SUPERVISOR')";
    private final IrrigationTurnsService service;

    @GetMapping("/sectors")
    @PreAuthorize(READERS)
    public ResponseEntity<ApiResponse<List<IrrigationZoneResponse>>> sectors(
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok("Sectores accesibles", service.sectors(user.getUsername())));
    }

    @GetMapping("/sectors/{sectorId}/sections")
    @PreAuthorize(READERS)
    public ResponseEntity<ApiResponse<List<IrrigationZoneResponse>>> sections(
            @PathVariable Long sectorId, @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok("Secciones del sector", service.sections(sectorId, user.getUsername())));
    }

    @GetMapping("/turns")
    @PreAuthorize(READERS)
    public ResponseEntity<ApiResponse<List<IrrigationTurnResponse>>> turns(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long sectorId,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok("Turnos de riego", service.list(from, to, sectorId, user.getUsername())));
    }

    @GetMapping("/turns/{id}")
    @PreAuthorize(READERS)
    public ResponseEntity<ApiResponse<IrrigationTurnResponse>> findOne(
            @PathVariable Long id, @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok("Turno de riego", service.findOne(id, user.getUsername())));
    }

    /** Un pedido registra uno o varios turnos, cada uno vinculado a su sector. */
    @PostMapping("/turns/batch")
    @PreAuthorize("hasAuthority('SUPERVISOR')")
    public ResponseEntity<ApiResponse<List<IrrigationTurnResponse>>> createBatch(
            @Valid @RequestBody CreateIrrigationBatchRequest request,
            @AuthenticationPrincipal UserDetails user) {
        List<IrrigationTurnResponse> created = service.createBatch(request.turns(), user.getUsername());
        return ResponseEntity.ok(ApiResponse.ok("Turnos registrados por sector", created));
    }

    @PostMapping("/turns")
    @PreAuthorize("hasAuthority('SUPERVISOR')")
    public ResponseEntity<ApiResponse<IrrigationTurnResponse>> create(
            @Valid @RequestBody CreateIrrigationTurnRequest request,
            @AuthenticationPrincipal UserDetails user) {
        IrrigationTurnResponse created = service.create(request, user.getUsername());
        return ResponseEntity.created(URI.create("/api/v1/irrigation/turns/" + created.id()))
            .body(ApiResponse.ok("Turno registrado", created));
    }
}
