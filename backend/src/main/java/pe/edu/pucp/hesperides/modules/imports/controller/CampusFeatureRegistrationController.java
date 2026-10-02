package pe.edu.pucp.hesperides.modules.imports.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import pe.edu.pucp.hesperides.modules.imports.dto.FeatureForm;
import pe.edu.pucp.hesperides.modules.imports.service.FeatureRegistrationService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;

import java.util.Map;

/** Registro de un tacho o bebedero por formulario (SPEC-103 §3). */
@RestController
@RequiredArgsConstructor
public class CampusFeatureRegistrationController {

    private final FeatureRegistrationService service;

    @PostMapping(value = "/api/v1/campus-features", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyAuthority('ADMIN', 'COORDINADOR', 'SUPERVISOR')")
    public ResponseEntity<ApiResponse<Map<String, String>>> register(
            @Valid @RequestPart("data") FeatureForm form, @RequestPart(value = "photo", required = false) MultipartFile photo,
            @RequestParam(defaultValue = "false") boolean confirmDuplicate, @AuthenticationPrincipal UserDetails principal) {
        String code = service.register(form, UploadedFiles.photo(photo), confirmDuplicate, principal.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Component registered", Map.of("code", code)));
    }
}
