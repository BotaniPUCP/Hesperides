package pe.edu.pucp.hesperides.modules.imports.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import pe.edu.pucp.hesperides.modules.imports.dto.AssessmentForm;
import pe.edu.pucp.hesperides.modules.imports.dto.AssessmentResponse;
import pe.edu.pucp.hesperides.modules.imports.dto.SpecimenForm;
import pe.edu.pucp.hesperides.modules.imports.service.SpecimenRegistrationService;
import pe.edu.pucp.hesperides.modules.imports.service.SpecimenRegistrationService.Photo;
import pe.edu.pucp.hesperides.modules.inventory.service.InventoryPhotoService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;

import java.util.List;
import java.util.Map;

/** Registro de ejemplares por formulario, su historial de evaluaciones y la foto genérica de especie. */
@RestController
@RequiredArgsConstructor
public class SpecimenRegistrationController {

    private static final String REGISTRARS = "hasAnyAuthority('ADMIN', 'COORDINADOR', 'SUPERVISOR')";
    private static final String MANAGERS = "hasAnyAuthority('ADMIN', 'COORDINADOR')";

    private final SpecimenRegistrationService service;
    private final InventoryPhotoService photos;

    @PostMapping(value = "/api/v1/green-inventory/specimens", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize(REGISTRARS)
    public ResponseEntity<ApiResponse<Map<String, String>>> register(
            @Valid @RequestPart("data") SpecimenForm form, @RequestPart(value = "photo", required = false) MultipartFile photo,
            @RequestParam(defaultValue = "false") boolean confirmDuplicate, @AuthenticationPrincipal UserDetails principal) {
        String code = service.register(form, photoOf(photo), confirmDuplicate, principal.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Specimen registered", Map.of("code", code)));
    }

    @PutMapping(value = "/api/v1/green-inventory/specimens/{code}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize(REGISTRARS)
    public ResponseEntity<ApiResponse<Map<String, String>>> update(
            @PathVariable String code, @Valid @RequestPart("data") SpecimenForm form,
            @RequestPart(value = "photo", required = false) MultipartFile photo,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(ApiResponse.ok("Specimen updated",
                Map.of("code", service.update(code, form, photoOf(photo), principal.getUsername()))));
    }

    @GetMapping("/api/v1/green-inventory/specimens/{code}/assessments")
    public ResponseEntity<ApiResponse<List<AssessmentResponse>>> history(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok("Assessment history", service.history(code)));
    }

    @PostMapping("/api/v1/green-inventory/specimens/{code}/assessments")
    @PreAuthorize(REGISTRARS)
    public ResponseEntity<ApiResponse<List<AssessmentResponse>>> assess(
            @PathVariable String code, @Valid @RequestBody AssessmentForm form,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Assessment registered", service.assess(code, form, principal.getUsername())));
    }

    @PostMapping(value = "/api/v1/green-inventory/species/{slug}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize(MANAGERS)
    public ResponseEntity<ApiResponse<Void>> speciesPhoto(
            @PathVariable String slug, @RequestPart("photo") MultipartFile photo,
            @AuthenticationPrincipal UserDetails principal) {
        photos.setSpeciesPhoto(slug, UploadedFiles.required(photo), null, principal.getUsername());
        return ResponseEntity.ok(ApiResponse.ok("Species photo saved", null));
    }

    private static Photo photoOf(MultipartFile file) {
        byte[] content = UploadedFiles.optional(file);
        return content == null ? null : new Photo(content, file.getOriginalFilename());
    }
}
