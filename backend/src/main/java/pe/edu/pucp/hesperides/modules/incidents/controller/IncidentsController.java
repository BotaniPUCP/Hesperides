package pe.edu.pucp.hesperides.modules.incidents.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.*;
import pe.edu.pucp.hesperides.modules.incidents.service.*;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController @RequiredArgsConstructor
@RequestMapping("/api/v1/incidents")
@PreAuthorize(IncidentsController.MEMBERS)
public class IncidentsController {
    /** El operario reporta y ve lo suyo (SPEC-201 §3.1); administración actúa como coordinación. */
    static final String MEMBERS = "hasAnyAuthority('ADMIN','COORDINADOR','SUPERVISOR','OPERARIO')";
    static final String MANAGERS = "hasAnyAuthority('ADMIN','COORDINADOR')";
    private final IncidentQueryService queries;
    private final IncidentCaptureService capture;
    private final IncidentReviewService review;
    private final IncidentClosureService closure;

    /** Antes que /{id}: todas las que ve quien pregunta, para filtrarlas en el navegador (SPEC-119). */
    @GetMapping("/all")
    public ResponseEntity<ApiResponse<List<IncidentResponse>>> all(@AuthenticationPrincipal UserDetails user) {
        return ok(queries.all(user.getUsername()));
    }

    @GetMapping("/mine")
    public ResponseEntity<ApiResponse<MineResponse>> mine(@AuthenticationPrincipal UserDetails user) {
        return ok(queries.mine(user.getUsername()));
    }

    @GetMapping("/options")
    public ResponseEntity<ApiResponse<OptionsResponse>> options(@AuthenticationPrincipal UserDetails user) {
        return ok(queries.options(user.getUsername()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DetailResponse>> get(@PathVariable Long id, @AuthenticationPrincipal UserDetails user) {
        return ok(queries.get(id, user.getUsername()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<DetailResponse>> create(@Valid @RequestBody CreateIncidentRequest request,
            @RequestHeader("Idempotency-Key") UUID reference, @AuthenticationPrincipal UserDetails user) {
        var result = capture.create(request, reference, user.getUsername());
        if (!result.created()) return ok(result.detail());
        return ResponseEntity.created(URI.create("/api/v1/incidents/" + result.detail().incident().id()))
                .body(ApiResponse.ok("Incident received", result.detail()));
    }

    @PutMapping("/{id}") @PreAuthorize(MANAGERS)
    public ResponseEntity<ApiResponse<DetailResponse>> update(@PathVariable Long id,
            @Valid @RequestBody ReviewIncidentRequest request, @AuthenticationPrincipal UserDetails user) {
        return ok(review.update(id, request, user.getUsername()));
    }

    @PostMapping("/{id}/activate") @PreAuthorize(MANAGERS)
    public ResponseEntity<ApiResponse<DetailResponse>> activate(@PathVariable Long id,
            @Valid @RequestBody VersionRequest request, @AuthenticationPrincipal UserDetails user) {
        return ok(review.activate(id, request, user.getUsername()));
    }

    @PostMapping("/{id}/prefill/retry") @PreAuthorize(MANAGERS)
    public ResponseEntity<ApiResponse<DetailResponse>> retryPrefill(@PathVariable Long id, @AuthenticationPrincipal UserDetails user) {
        return ok(review.retryPrefill(id, user.getUsername()));
    }

    @PostMapping("/{id}/close") @PreAuthorize(MANAGERS)
    public ResponseEntity<ApiResponse<DetailResponse>> close(@PathVariable Long id,
            @Valid @RequestBody CloseRequest request, @AuthenticationPrincipal UserDetails user) {
        return ok(closure.close(id, request, user.getUsername()));
    }

    static <T> ResponseEntity<ApiResponse<T>> ok(T data) {
        return ResponseEntity.ok(ApiResponse.ok("OK", data));
    }
}
