package pe.edu.pucp.hesperides.modules.places.controller;

import jakarta.validation.Valid;
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
import pe.edu.pucp.hesperides.modules.places.dto.MapViewDtos.MapView;
import pe.edu.pucp.hesperides.modules.places.dto.PlaceRequest;
import pe.edu.pucp.hesperides.modules.places.dto.PlaceResponses.MapCatalog;
import pe.edu.pucp.hesperides.modules.places.dto.PlaceResponses.PlaceDetail;
import pe.edu.pucp.hesperides.modules.places.dto.PlaceResponses.PlaceSummary;
import pe.edu.pucp.hesperides.modules.places.service.PlaceMapViewService;
import pe.edu.pucp.hesperides.modules.places.service.PlaceQueryService;
import pe.edu.pucp.hesperides.modules.places.service.PlaceService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;

/** El catálogo de lugares. Lo lee cualquier rol; lo editan administración y coordinación. */
@RestController
@RequestMapping("/api/v1/places")
@RequiredArgsConstructor
public class PlaceController {

    static final String EDITORS = "hasAnyAuthority('ADMIN', 'COORDINADOR')";

    private final PlaceService service;
    private final PlaceQueryService queries;
    private final PlaceMapViewService mapViews;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PlaceSummary>>> list(@RequestParam(required = false) String q,
            @RequestParam(required = false) String category, @RequestParam(required = false) String kind) {
        return ResponseEntity.ok(ApiResponse.ok("Places", queries.list(q, category, kind)));
    }

    /** Antes que /{code}: «map» no es un código de lugar. */
    @GetMapping("/map")
    public ResponseEntity<ApiResponse<MapCatalog>> map() {
        return ResponseEntity.ok(ApiResponse.ok("Places on the map", queries.map()));
    }

    @GetMapping("/{code}")
    public ResponseEntity<ApiResponse<PlaceDetail>> detail(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok("Place", queries.detail(code)));
    }

    @PostMapping
    @PreAuthorize(EDITORS)
    public ResponseEntity<ApiResponse<Map<String, String>>> create(@Valid @RequestBody PlaceRequest request) {
        String code = service.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Place created", Map.of("code", code)));
    }

    @PutMapping("/{code}")
    @PreAuthorize(EDITORS)
    public ResponseEntity<ApiResponse<Void>> update(@PathVariable String code, @Valid @RequestBody PlaceRequest request) {
        service.update(code, request);
        return ResponseEntity.ok(ApiResponse.ok("Place updated", null));
    }

    @PutMapping("/{code}/map-view")
    @PreAuthorize(EDITORS)
    public ResponseEntity<ApiResponse<Void>> saveMapView(@PathVariable String code, @Valid @RequestBody MapView view) {
        mapViews.save(code, view);
        return ResponseEntity.ok(ApiResponse.ok("Map view saved", null));
    }

    @DeleteMapping("/{code}/map-view")
    @PreAuthorize(EDITORS)
    public ResponseEntity<ApiResponse<Void>> clearMapView(@PathVariable String code) {
        mapViews.save(code, null);
        return ResponseEntity.ok(ApiResponse.ok("Map view cleared", null));
    }

    @DeleteMapping("/{code}")
    @PreAuthorize(EDITORS)
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String code) {
        service.delete(code);
        return ResponseEntity.ok(ApiResponse.ok("Place deleted", null));
    }
}
