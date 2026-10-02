package pe.edu.pucp.hesperides.modules.inventory.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.pucp.hesperides.modules.inventory.dto.PhotoSyncResponse;
import pe.edu.pucp.hesperides.modules.inventory.repository.PhotoRepository;
import pe.edu.pucp.hesperides.modules.inventory.repository.PhotoRepository.PhotoKeys;
import pe.edu.pucp.hesperides.modules.inventory.service.InventoryPhotoService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;
import pe.edu.pucp.hesperides.shared.storage.FileStorage;

import java.time.Duration;
import java.util.Optional;

/**
 * Sirve las fotos del inventario. Son públicas como el inventario (README del
 * inventario, aviso de seguridad). En S3 redirige a una URL prefirmada; en
 * local, el backend entrega el archivo.
 */
@RestController
@RequiredArgsConstructor
public class InventoryPhotoController {

    private final PhotoRepository repository;
    private final FileStorage storage;
    private final InventoryPhotoService service;

    @GetMapping("/api/v1/files/green-elements/{id}")
    public ResponseEntity<byte[]> specimenPhoto(@PathVariable long id, @RequestParam(defaultValue = "full") String size) {
        return serve(repository.elementPhoto(id), size);
    }

    @GetMapping("/api/v1/files/species/{id}")
    public ResponseEntity<byte[]> speciesPhoto(@PathVariable long id, @RequestParam(defaultValue = "full") String size) {
        return serve(repository.speciesPhoto(id), size);
    }

    @PostMapping("/api/v1/green-inventory/photos/sync")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<PhotoSyncResponse>> sync(
            @RequestParam(defaultValue = "50") int limit, @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(ApiResponse.ok("Photos synchronized",
                service.syncCatastroPhotos(limit, principal.getUsername())));
    }

    private ResponseEntity<byte[]> serve(Optional<PhotoKeys> found, String size) {
        PhotoKeys keys = found.orElseThrow(() -> new ResourceNotFoundException("Photo not found"));
        String key = "thumb".equals(size) ? keys.thumbnail() : keys.full();
        return storage.directUrl(key)
                .map(url -> ResponseEntity.status(HttpStatus.FOUND).location(url).<byte[]>build())
                // Una foto guardada no cambia: su clave es única, así que se puede cachear.
                .orElseGet(() -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(keys.contentType()))
                        .cacheControl(CacheControl.maxAge(Duration.ofDays(30)).cachePublic())
                        .body(storage.read(key)));
    }
}
