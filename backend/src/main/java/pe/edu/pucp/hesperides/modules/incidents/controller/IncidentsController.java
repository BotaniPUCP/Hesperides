package pe.edu.pucp.hesperides.modules.incidents.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.*;
import pe.edu.pucp.hesperides.modules.incidents.service.IncidentsService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;
import java.net.URI;
import java.util.UUID;

@RestController @RequiredArgsConstructor
@RequestMapping("/api/v1/incidents")
@PreAuthorize("hasAnyAuthority('COORDINADOR','SUPERVISOR')")
public class IncidentsController {
    private final IncidentsService service;
    public record ApprovalRequest(@NotNull @PositiveOrZero Long version) {}

    @GetMapping
    public ResponseEntity<ApiResponse<Page<IncidentResponse>>> getAll(
            @RequestParam(required = false) String search, @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserDetails user) {
        return ok(service.getAll(user.getUsername(), search, status, page, size));
    }
    @GetMapping("/options")
    public ResponseEntity<ApiResponse<OptionsResponse>> options(@AuthenticationPrincipal UserDetails user) {
        return ok(service.options(user.getUsername()));
    }
    @GetMapping("/summary") @PreAuthorize("hasAuthority('COORDINADOR')")
    public ResponseEntity<ApiResponse<SummaryResponse>> summary(@AuthenticationPrincipal UserDetails user) {
        return ok(service.summary(user.getUsername()));
    }
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DetailResponse>> getById(@PathVariable Long id, @AuthenticationPrincipal UserDetails user) {
        return ok(service.getById(id, user.getUsername()));
    }
    @PostMapping
    public ResponseEntity<ApiResponse<DetailResponse>> create(@Valid @RequestBody CreateIncidentRequest request,
            @RequestHeader("Idempotency-Key") UUID reference, @AuthenticationPrincipal UserDetails user) {
        var result = service.create(request, reference, user.getUsername());
        return result.created() ? ResponseEntity.created(URI.create("/api/v1/incidents/" + result.detail().incident().id()))
                .body(ApiResponse.ok("Incident received", result.detail())) : ok(result.detail());
    }
    @PutMapping("/{id}") @PreAuthorize("hasAuthority('COORDINADOR')")
    public ResponseEntity<ApiResponse<DetailResponse>> update(@PathVariable Long id,
            @Valid @RequestBody ReviewIncidentRequest request, @AuthenticationPrincipal UserDetails user) {
        return ok(service.update(id, request, user.getUsername()));
    }
    @PostMapping("/{id}/approve") @PreAuthorize("hasAuthority('COORDINADOR')")
    public ResponseEntity<ApiResponse<DetailResponse>> approve(@PathVariable Long id,
            @Valid @RequestBody ApprovalRequest request, @AuthenticationPrincipal UserDetails user) {
        return ok(service.approve(id, request.version(), user.getUsername()));
    }
    @PostMapping("/{id}/start")
    public ResponseEntity<ApiResponse<DetailResponse>> start(@PathVariable Long id, @AuthenticationPrincipal UserDetails user) {
        return ok(service.start(id, user.getUsername()));
    }
    @PostMapping("/{id}/resolve")
    public ResponseEntity<ApiResponse<DetailResponse>> resolve(@PathVariable Long id, @AuthenticationPrincipal UserDetails user) {
        return ok(service.resolve(id, user.getUsername()));
    }
    @PostMapping("/{id}/interventions")
    public ResponseEntity<ApiResponse<DetailResponse>> addIntervention(@PathVariable Long id,
            @Valid @RequestBody CreateInterventionRequest request, @AuthenticationPrincipal UserDetails user) {
        return ok(service.addIntervention(id, request, user.getUsername()));
    }
    @PostMapping("/{id}/interventions/{workId}/complete")
    public ResponseEntity<ApiResponse<DetailResponse>> completeIntervention(@PathVariable Long id, @PathVariable Long workId,
            @AuthenticationPrincipal UserDetails user) {
        return ok(service.completeIntervention(id, workId, user.getUsername()));
    }
    @PostMapping(value = "/{id}/photos", consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<PhotoResponse>> addPhoto(@PathVariable Long id,
            @RequestParam UUID clientReference, @RequestParam MultipartFile file, @AuthenticationPrincipal UserDetails user) {
        return ok(service.addPhoto(id, clientReference, file, user.getUsername()));
    }
    @GetMapping("/{id}/photos/{photoId}")
    public ResponseEntity<ApiResponse<PhotoContentResponse>> getPhoto(@PathVariable Long id, @PathVariable Long photoId,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok().header("Cache-Control", "no-store")
                .body(ApiResponse.ok("Photo retrieved", service.getPhoto(id, photoId, user.getUsername())));
    }
    private <T> ResponseEntity<ApiResponse<T>> ok(T data) { return ResponseEntity.ok(ApiResponse.ok("Success", data)); }
}
