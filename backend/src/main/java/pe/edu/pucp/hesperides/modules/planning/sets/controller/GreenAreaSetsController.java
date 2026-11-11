package pe.edu.pucp.hesperides.modules.planning.sets.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.pucp.hesperides.modules.planning.sets.dto.GreenAreaSetRequest;
import pe.edu.pucp.hesperides.modules.planning.sets.dto.GreenAreaSetResponses.Detail;
import pe.edu.pucp.hesperides.modules.planning.sets.dto.GreenAreaSetResponses.ElementRef;
import pe.edu.pucp.hesperides.modules.planning.sets.dto.GreenAreaSetResponses.Summary;
import pe.edu.pucp.hesperides.modules.planning.sets.service.GreenAreaSetsService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;

import java.net.URI;
import java.util.List;

/** SPEC-203 D-12: los conjuntos son de coordinación. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/green-area-sets")
@PreAuthorize("hasAnyAuthority('ADMIN', 'COORDINADOR')")
public class GreenAreaSetsController {

    private final GreenAreaSetsService service;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Summary>>> list() {
        return ResponseEntity.ok(ApiResponse.ok("Conjuntos de áreas verdes", service.list()));
    }

    /** Antes que /{id}: la ruta literal no debe leerse como un id. */
    @GetMapping("/element-options")
    public ResponseEntity<ApiResponse<List<ElementRef>>> elementOptions() {
        return ResponseEntity.ok(ApiResponse.ok("Ejemplares disponibles", service.elementOptions()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Detail>> get(@PathVariable long id) {
        return ResponseEntity.ok(ApiResponse.ok("Conjunto de áreas verdes", service.get(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Detail>> create(@Valid @RequestBody GreenAreaSetRequest request,
                                                      @AuthenticationPrincipal UserDetails user) {
        Detail created = service.create(request, user.getUsername());
        return ResponseEntity.created(URI.create("/api/v1/green-area-sets/" + created.id()))
                .body(ApiResponse.ok("Conjunto creado", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Detail>> update(@PathVariable long id,
                                                      @Valid @RequestBody GreenAreaSetRequest request,
                                                      @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.ok("Conjunto actualizado", service.update(id, request, user.getUsername())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable long id) {
        service.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("Conjunto dado de baja", null));
    }
}
