package pe.edu.pucp.hesperides.modules.incidents.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.*;
import pe.edu.pucp.hesperides.modules.incidents.service.IncidentAttachmentsService;
import pe.edu.pucp.hesperides.modules.incidents.service.IncidentMapService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;

import java.util.UUID;

import static pe.edu.pucp.hesperides.modules.incidents.controller.IncidentsController.ok;

/** Fotos privadas, comentarios y la capa del mapa, con el alcance de cada persona (SPEC-201 §3.1). */
@RestController @RequiredArgsConstructor
@RequestMapping("/api/v1/incidents")
@PreAuthorize(IncidentsController.MEMBERS)
public class IncidentAttachmentsController {
    private final IncidentAttachmentsService attachments;
    private final IncidentMapService map;

    @PostMapping(value = "/{id}/photos", consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<PhotoResponse>> addPhoto(@PathVariable Long id,
            @RequestParam("clientReference") UUID clientReference, @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserDetails user) {
        return ok(attachments.addPhoto(id, clientReference, file, user.getUsername()));
    }

    @GetMapping("/{id}/photos/{photoId}")
    public ResponseEntity<ApiResponse<PhotoContentResponse>> photo(@PathVariable Long id, @PathVariable Long photoId,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok().header("Cache-Control", "no-store")
                .body(ApiResponse.ok("Photo retrieved", attachments.photo(id, photoId, user.getUsername())));
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<ApiResponse<DetailResponse>> comment(@PathVariable Long id,
            @Valid @RequestBody CommentRequest request, @AuthenticationPrincipal UserDetails user) {
        return ok(attachments.comment(id, request, user.getUsername()));
    }

    @GetMapping("/map")
    public ResponseEntity<ApiResponse<MapResponse>> map(@AuthenticationPrincipal UserDetails user) {
        return ok(map.map(user.getUsername()));
    }
}
