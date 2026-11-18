package pe.edu.pucp.hesperides.modules.incidents.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.*;
import pe.edu.pucp.hesperides.modules.incidents.service.IncidentLinksService;
import pe.edu.pucp.hesperides.modules.incidents.service.IncidentMapService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;

import java.util.List;

import static pe.edu.pucp.hesperides.modules.incidents.controller.IncidentsController.ok;
import static pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.MAX_SUMMARY;

/** El mismo vínculo se crea y se quita desde Incidencias o desde Intervenciones (SPEC-201 §3.8). */
@RestController @RequiredArgsConstructor
@PreAuthorize(IncidentsController.MANAGERS)
public class IncidentLinksController {
    private final IncidentLinksService links;
    private final IncidentMapService search;

    public record WorkSideLink(@NotNull @Positive Long incidentId) {}
    public record WorkSideRemoval(@NotBlank @Size(max = MAX_SUMMARY) String reason) {}

    @PostMapping("/api/v1/incidents/{id}/links")
    public ResponseEntity<ApiResponse<DetailResponse>> link(@PathVariable Long id,
            @Valid @RequestBody LinkRequest request, @AuthenticationPrincipal UserDetails user) {
        return ok(links.link(id, request, user.getUsername()));
    }

    @PostMapping("/api/v1/incidents/{id}/links/{linkId}/remove")
    public ResponseEntity<ApiResponse<DetailResponse>> unlink(@PathVariable Long id, @PathVariable Long linkId,
            @Valid @RequestBody ReasonRequest request, @AuthenticationPrincipal UserDetails user) {
        return ok(links.unlink(id, linkId, request, user.getUsername()));
    }

    @PostMapping("/api/v1/incidents/{id}/links/{linkId}/replace")
    public ResponseEntity<ApiResponse<DetailResponse>> replace(@PathVariable Long id, @PathVariable Long linkId,
            @Valid @RequestBody ReplaceRequest request, @AuthenticationPrincipal UserDetails user) {
        return ok(links.replace(id, linkId, request, user.getUsername()));
    }

    @GetMapping("/api/v1/incidents/intervention-candidates")
    public ResponseEntity<ApiResponse<List<InterventionCandidateResponse>>> candidates(
            @AuthenticationPrincipal UserDetails user) {
        return ok(links.candidates(user.getUsername()));
    }

    @GetMapping("/api/v1/incidents/search")
    public ResponseEntity<ApiResponse<List<IncidentRefResponse>>> search(@AuthenticationPrincipal UserDetails user) {
        return ok(search.search(user.getUsername()));
    }

    @PostMapping("/api/v1/interventions/{interventionId}/incident-links")
    public ResponseEntity<ApiResponse<Void>> linkFromWork(@PathVariable Long interventionId,
            @Valid @RequestBody WorkSideLink request, @AuthenticationPrincipal UserDetails user) {
        links.linkFromIntervention(interventionId, List.of(request.incidentId()), user.getUsername());
        return ok(null);
    }

    @PostMapping("/api/v1/interventions/{interventionId}/incident-links/{linkId}/remove")
    public ResponseEntity<ApiResponse<Void>> unlinkFromWork(@PathVariable Long interventionId, @PathVariable Long linkId,
            @Valid @RequestBody WorkSideRemoval request, @AuthenticationPrincipal UserDetails user) {
        links.unlinkFromIntervention(interventionId, linkId, request.reason(), user.getUsername());
        return ok(null);
    }
}
