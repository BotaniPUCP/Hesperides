package pe.edu.pucp.hesperides.modules.places.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.pucp.hesperides.modules.places.dto.PerspectiveRequest;
import pe.edu.pucp.hesperides.modules.places.dto.PlaceResponses.NearbyPerspective;
import pe.edu.pucp.hesperides.modules.places.dto.PlaceResponses.Perspective;
import pe.edu.pucp.hesperides.modules.places.service.PerspectiveOrderService;
import pe.edu.pucp.hesperides.modules.places.service.PerspectiveService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;

/** Perspectivas de un lugar y las sugeridas por cercanía. */
@RestController
@RequestMapping("/api/v1/places")
@RequiredArgsConstructor
public class PerspectiveController {

    private final PerspectiveService service;
    private final PerspectiveOrderService order;

    @GetMapping("/perspectives/near")
    public ResponseEntity<ApiResponse<List<NearbyPerspective>>> near(@RequestParam double lat, @RequestParam double lon) {
        return ResponseEntity.ok(ApiResponse.ok("Nearby perspectives", service.near(lat, lon)));
    }

    @PostMapping("/{code}/perspectives")
    @PreAuthorize(PlaceController.EDITORS)
    public ResponseEntity<ApiResponse<Perspective>> create(@PathVariable String code,
            @Valid @RequestBody PerspectiveRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Perspective created", service.create(code, request)));
    }

    @PostMapping("/{code}/perspectives/preview")
    @PreAuthorize(PlaceController.EDITORS)
    public ResponseEntity<ApiResponse<Map<String, String>>> preview(@PathVariable String code,
            @Valid @RequestBody PerspectiveRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Preview", Map.of("displayName", service.preview(code, request))));
    }

    /** Antes que /{id}: «order» no es un id. */
    @PutMapping("/{code}/perspectives/order")
    @PreAuthorize(PlaceController.EDITORS)
    public ResponseEntity<ApiResponse<Void>> reorder(@PathVariable String code, @Valid @RequestBody OrderRequest request) {
        order.reorder(code, request.ids());
        return ResponseEntity.ok(ApiResponse.ok("Perspectives reordered", null));
    }

    /** Los ids de las perspectivas del lugar, en el orden nuevo. */
    public record OrderRequest(@NotEmpty(message = "Indica el orden de las perspectivas") List<@NotNull Long> ids) {
    }

    @PutMapping("/{code}/perspectives/{id}")
    @PreAuthorize(PlaceController.EDITORS)
    public ResponseEntity<ApiResponse<Perspective>> update(@PathVariable String code, @PathVariable long id,
            @Valid @RequestBody PerspectiveRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Perspective updated", service.update(code, id, request)));
    }

    @DeleteMapping("/{code}/perspectives/{id}")
    @PreAuthorize(PlaceController.EDITORS)
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String code, @PathVariable long id) {
        service.delete(code, id);
        return ResponseEntity.ok(ApiResponse.ok("Perspective deleted", null));
    }
}
