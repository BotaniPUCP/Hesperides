package pe.edu.pucp.hesperides.modules.campusevents.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import pe.edu.pucp.hesperides.modules.campusevents.dto.CampusEventDtos.CampusEventRequest;
import pe.edu.pucp.hesperides.modules.campusevents.dto.CampusEventDtos.CampusEventResponse;
import pe.edu.pucp.hesperides.modules.campusevents.dto.CampusEventDtos.Occurrence;
import pe.edu.pucp.hesperides.modules.campusevents.dto.CampusEventDtos.Warning;
import pe.edu.pucp.hesperides.modules.campusevents.service.CampusEventsService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/** Calendario del campus (SPEC-114 §3). Los cuatro roles leen; solo coordinación escribe (D-04). */
@RestController
@RequestMapping("/api/v1/campus-events")
@PreAuthorize(CampusEventsController.READERS)
@RequiredArgsConstructor
public class CampusEventsController {

    static final String READERS = "hasAnyAuthority('ADMIN', 'COORDINADOR', 'SUPERVISOR', 'OPERARIO')";
    static final String MAINTAINERS = "hasAnyAuthority('ADMIN', 'COORDINADOR')";

    private final CampusEventsService service;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Occurrence>>> list(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String type) {
        return ResponseEntity.ok(ApiResponse.ok("Campus events", service.occurrences(from, to, type)));
    }

    /** Antes que /{id}: «check» no es un id. */
    @GetMapping("/check")
    @PreAuthorize(MAINTAINERS)
    public ResponseEntity<ApiResponse<List<Warning>>> check(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) List<LocalDate> dates,
            @RequestParam(required = false) List<Long> zoneIds,
            @RequestParam(required = false) List<Long> placeIds,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime startTime,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime endTime) {
        return ResponseEntity.ok(ApiResponse.ok("Campus event warnings",
                service.check(dates, zoneIds, placeIds, startTime, endTime)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CampusEventResponse>> get(@PathVariable long id) {
        return ResponseEntity.ok(ApiResponse.ok("Campus event", service.get(id)));
    }

    @PostMapping
    @PreAuthorize(MAINTAINERS)
    public ResponseEntity<ApiResponse<CampusEventResponse>> create(@RequestBody CampusEventRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Campus event created", service.create(request, principal.getUsername())));
    }

    @PutMapping("/{id}")
    @PreAuthorize(MAINTAINERS)
    public ResponseEntity<ApiResponse<CampusEventResponse>> update(@PathVariable long id,
            @RequestBody CampusEventRequest request, @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(ApiResponse.ok("Campus event updated", service.update(id, request, principal.getUsername())));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(MAINTAINERS)
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable long id, @AuthenticationPrincipal UserDetails principal) {
        service.delete(id, principal.getUsername());
        return ResponseEntity.ok(ApiResponse.ok("Campus event deleted", null));
    }
}
