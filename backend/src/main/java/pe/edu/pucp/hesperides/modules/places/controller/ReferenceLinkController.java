package pe.edu.pucp.hesperides.modules.places.controller;

import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.pucp.hesperides.modules.places.dto.ReferenceLinkDtos.DiscardRequest;
import pe.edu.pucp.hesperides.modules.places.dto.ReferenceLinkDtos.LinkRequest;
import pe.edu.pucp.hesperides.modules.places.dto.ReferenceLinkDtos.Progress;
import pe.edu.pucp.hesperides.modules.places.dto.ReferenceLinkDtos.QueueGroup;
import pe.edu.pucp.hesperides.modules.places.service.ReferenceMigrationService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;

/** La cola de migración de referencias antiguas. Solo para quienes editan el catálogo. */
@RestController
@RequestMapping("/api/v1/places/reference-links")
@PreAuthorize(PlaceController.EDITORS)
@RequiredArgsConstructor
public class ReferenceLinkController {

    private final ReferenceMigrationService service;

    /** Toda la cola, con sus sugerencias: se busca y pagina en el navegador (SPEC-119). */
    @GetMapping("/queue/all")
    public ResponseEntity<ApiResponse<List<QueueGroup>>> queue() {
        return ResponseEntity.ok(ApiResponse.ok("Pending references", service.queue()));
    }

    @GetMapping("/progress")
    public ResponseEntity<ApiResponse<Progress>> progress() {
        return ResponseEntity.ok(ApiResponse.ok("Migration progress", service.progress()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Void>> link(@Valid @RequestBody LinkRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        service.link(request, principal.getUsername());
        return ResponseEntity.ok(ApiResponse.ok("References linked", null));
    }

    @PostMapping("/discard")
    public ResponseEntity<ApiResponse<Void>> discard(@Valid @RequestBody DiscardRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        service.discard(request.referenceCodes(), principal.getUsername());
        return ResponseEntity.ok(ApiResponse.ok("References discarded", null));
    }
}
