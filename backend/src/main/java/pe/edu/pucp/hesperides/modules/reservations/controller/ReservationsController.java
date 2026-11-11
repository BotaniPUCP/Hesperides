package pe.edu.pucp.hesperides.modules.reservations.controller;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.pucp.hesperides.modules.reservations.dto.ReservationDtos.CancelRequest;
import pe.edu.pucp.hesperides.modules.reservations.dto.ReservationDtos.GardenOption;
import pe.edu.pucp.hesperides.modules.reservations.dto.ReservationDtos.OrganizationOption;
import pe.edu.pucp.hesperides.modules.reservations.dto.ReservationDtos.Page;
import pe.edu.pucp.hesperides.modules.reservations.dto.ReservationDtos.ReservationRequest;
import pe.edu.pucp.hesperides.modules.reservations.dto.ReservationDtos.ReservationResponse;
import pe.edu.pucp.hesperides.modules.reservations.dto.ReservationDtos.Warning;
import pe.edu.pucp.hesperides.modules.reservations.service.ReservationsService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;

/**
 * Agenda de reservas de jardines (SPEC-107 §3). Los avisos de cercanía y cruce
 * viajan con la reserva al guardar y se consultan aparte antes de decidir; ninguno
 * cambia el código HTTP de una operación válida.
 */
@RestController
@RequestMapping("/api/v1/reservations")
@PreAuthorize(ReservationAccess.READERS)
@RequiredArgsConstructor
public class ReservationsController {

    private final ReservationsService service;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ReservationResponse>>> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long placeId,
            @RequestParam(required = false) String organizationCode,
            @RequestParam(defaultValue = "false") boolean includeCancelled,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok("Reservations",
                service.list(from, to, placeId, organizationCode, includeCancelled, page, size)));
    }

    /** Antes que /{code}: estos segmentos no son códigos de reserva. */
    @GetMapping("/gardens")
    public ResponseEntity<ApiResponse<List<GardenOption>>> gardens(@RequestParam(required = false) String q) {
        return ResponseEntity.ok(ApiResponse.ok("Reservable gardens", service.gardens(q)));
    }

    @GetMapping("/organizations")
    public ResponseEntity<ApiResponse<List<OrganizationOption>>> organizations() {
        return ResponseEntity.ok(ApiResponse.ok("Organizations with reservations", service.organizations()));
    }

    @GetMapping("/check")
    @PreAuthorize(ReservationAccess.MAINTAINERS)
    public ResponseEntity<ApiResponse<List<Warning>>> check(@RequestParam Long placeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime startsAt,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime endsAt,
            @RequestParam(required = false) String excludeCode) {
        return ResponseEntity.ok(ApiResponse.ok("Reservation warnings",
                service.check(placeId, startsAt, endsAt, excludeCode)));
    }

    @GetMapping("/nearby")
    @PreAuthorize(ReservationAccess.MAINTAINERS)
    public ResponseEntity<ApiResponse<List<Warning>>> nearby(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) List<Long> zoneIds,
            @RequestParam(required = false) List<Long> placeIds,
            @RequestParam(required = false) String points,
            @RequestParam(required = false) List<Long> elementIds,
            @RequestParam(required = false) String elementCodes) {
        List<String> codes = elementCodes == null || elementCodes.isBlank() ? List.of()
                : Arrays.stream(elementCodes.split(",")).map(String::strip).filter(c -> !c.isEmpty()).toList();
        return ResponseEntity.ok(ApiResponse.ok("Reservation warnings",
                service.nearby(date, zoneIds, placeIds, points, elementIds, codes)));
    }

    @GetMapping("/{code}")
    public ResponseEntity<ApiResponse<ReservationResponse>> detail(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok("Reservation", service.get(code)));
    }

    @PostMapping
    @PreAuthorize(ReservationAccess.MAINTAINERS)
    public ResponseEntity<ApiResponse<ReservationResponse>> create(@RequestBody ReservationRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Reservation created", service.create(request, principal.getUsername())));
    }

    @PutMapping("/{code}")
    @PreAuthorize(ReservationAccess.MAINTAINERS)
    public ResponseEntity<ApiResponse<ReservationResponse>> update(@PathVariable String code,
            @RequestBody ReservationRequest request, @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(ApiResponse.ok("Reservation updated",
                service.update(code, request, principal.getUsername())));
    }

    @PostMapping("/{code}/cancel")
    @PreAuthorize(ReservationAccess.MAINTAINERS)
    public ResponseEntity<ApiResponse<ReservationResponse>> cancel(@PathVariable String code,
            @RequestBody CancelRequest request, @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(ApiResponse.ok("Reservation cancelled",
                service.cancel(code, request, principal.getUsername())));
    }
}
