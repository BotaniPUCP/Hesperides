package pe.edu.pucp.hesperides.modules.places.controller;

import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import pe.edu.pucp.hesperides.modules.places.dto.PlaceResponses.Photo;
import pe.edu.pucp.hesperides.modules.places.repository.PlacePhotoRepository.FileKeys;
import pe.edu.pucp.hesperides.modules.places.service.PlacePhotoService;
import pe.edu.pucp.hesperides.modules.places.service.PlacePhotoService.PhotoTarget;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;
import pe.edu.pucp.hesperides.shared.storage.FileStorage;
import pe.edu.pucp.hesperides.shared.storage.PhotoUploads;
import pe.edu.pucp.hesperides.shared.storage.StoredFileResponses;

/** Sube, da de baja y sirve las fotos de un lugar. */
@RestController
@RequiredArgsConstructor
public class PlacePhotoController {

    private final PlacePhotoService service;
    private final FileStorage storage;

    @PostMapping(value = "/api/v1/places/{code}/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize(PlaceController.EDITORS)
    public ResponseEntity<ApiResponse<Photo>> upload(@PathVariable String code, @RequestPart("file") MultipartFile file,
            @RequestParam(required = false) Long perspectiveId, @RequestParam(required = false) String interiorViewCode,
            @RequestParam(required = false) String author,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate takenOn,
            @AuthenticationPrincipal UserDetails principal) {
        Photo photo = service.add(code, PhotoUploads.required(file),
                new PhotoTarget(perspectiveId, interiorViewCode, author, takenOn), principal.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Photo added", photo));
    }

    @DeleteMapping("/api/v1/places/{code}/photos/{photoId}")
    @PreAuthorize(PlaceController.EDITORS)
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable String code, @PathVariable long photoId) {
        service.delete(code, photoId);
        return ResponseEntity.ok(ApiResponse.ok("Photo deleted", null));
    }

    /** Pública como las del inventario: un {@code <img>} no puede mandar el token. */
    @GetMapping("/api/v1/files/places/{photoId}")
    public ResponseEntity<byte[]> file(@PathVariable long photoId, @RequestParam(defaultValue = "full") String size) {
        FileKeys keys = service.file(photoId);
        return StoredFileResponses.serve(storage, "thumb".equals(size) ? keys.thumbnail() : keys.full(), keys.contentType());
    }
}
