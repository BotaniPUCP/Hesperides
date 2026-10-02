package pe.edu.pucp.hesperides.modules.imports.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.pucp.hesperides.modules.imports.dto.InboxLoadResponse;
import pe.edu.pucp.hesperides.modules.imports.service.SpeciesPhotoInboxService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;

/** Carga inicial de las fotos de especie que esperan en la bandeja del servidor (SPEC-104 D-05). */
@RestController
@RequiredArgsConstructor
public class SpeciesPhotoInboxController {

    private final SpeciesPhotoInboxService inbox;

    /** POST y no GET: escribe en la base y borra los originales de la bandeja. */
    @PostMapping("/api/v1/green-inventory/species-photos/load-inbox")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<InboxLoadResponse>> load(@AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(ApiResponse.ok("Inbox loaded", inbox.load(principal.getUsername())));
    }
}
