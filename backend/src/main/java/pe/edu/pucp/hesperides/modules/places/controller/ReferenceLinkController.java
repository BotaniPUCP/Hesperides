package pe.edu.pucp.hesperides.modules.places.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.pucp.hesperides.modules.places.dto.ReferenceLinkDtos.DiscardRequest;
import pe.edu.pucp.hesperides.modules.places.dto.ReferenceLinkDtos.LinkRequest;
import pe.edu.pucp.hesperides.modules.places.dto.ReferenceLinkDtos.Progress;
import pe.edu.pucp.hesperides.modules.places.dto.ReferenceLinkDtos.QueuePage;
import pe.edu.pucp.hesperides.modules.places.service.ReferenceMigrationService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

/** La cola de migración de referencias antiguas. Solo para quienes editan el catálogo. */
@RestController
@RequestMapping("/api/v1/places/reference-links")
@PreAuthorize(PlaceController.EDITORS)
@RequiredArgsConstructor
public class ReferenceLinkController {

    private static final int MAX_PAGE_SIZE = 50;

    private final ReferenceMigrationService service;

    @GetMapping("/queue")
    public ResponseEntity<ApiResponse<QueuePage>> queue(@RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            throw new ValidationException("page must be >= 0 and size between 1 and " + MAX_PAGE_SIZE);
        }
        return ResponseEntity.ok(ApiResponse.ok("Pending references", service.queue(q, page, size)));
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
