package pe.edu.pucp.hesperides.modules.imports.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import pe.edu.pucp.hesperides.modules.imports.dto.ConfirmImportRequest;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportPreviewResponse;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportResultResponse;
import pe.edu.pucp.hesperides.modules.imports.service.CsvTemplates;
import pe.edu.pucp.hesperides.modules.imports.service.SpecimenExportService;
import pe.edu.pucp.hesperides.modules.imports.service.SpecimenImportService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;

/** Carga de catastro por CSV en dos pasos: vista previa y confirmación (SPEC-103 §5.2). */
@RestController
@RequiredArgsConstructor
public class ImportController {

    private static final String LOADERS = "hasAnyAuthority('ADMIN', 'COORDINADOR')";

    private final SpecimenImportService specimens;
    private final CsvTemplates templates;
    private final SpecimenExportService export;

    @PostMapping(value = "/api/v1/imports/specimens/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize(LOADERS)
    public ResponseEntity<ApiResponse<ImportPreviewResponse>> preview(
            @RequestPart("file") MultipartFile csv, @RequestPart(value = "photos", required = false) MultipartFile zip,
            @AuthenticationPrincipal UserDetails principal) {
        byte[] photos = zip == null || zip.isEmpty() ? null : bytes(zip);
        return ResponseEntity.ok(ApiResponse.ok("Preview ready",
                specimens.preview(bytes(csv), csv.getOriginalFilename(), photos, principal.getUsername())));
    }

    @PostMapping("/api/v1/imports/{batchId}/confirm")
    @PreAuthorize(LOADERS)
    public ResponseEntity<ApiResponse<ImportResultResponse>> confirm(
            @PathVariable long batchId, @RequestBody(required = false) ConfirmImportRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        ConfirmImportRequest body = request == null ? new ConfirmImportRequest(null) : request;
        return ResponseEntity.ok(ApiResponse.ok("Import confirmed",
                specimens.confirm(batchId, body.decisions(), principal.getUsername())));
    }

    @GetMapping("/api/v1/imports/templates/{kind}")
    public ResponseEntity<byte[]> template(@PathVariable String kind) {
        CsvTemplates.Template t = templates.get(kind);
        return csv(t.fileName(), t.content());
    }

    @GetMapping("/api/v1/green-inventory/export.csv")
    @PreAuthorize(LOADERS)
    public ResponseEntity<byte[]> exportSpecimens() {
        return csv("ejemplares.csv", export.export());
    }

    private static ResponseEntity<byte[]> csv(String fileName, byte[] content) {
        return ResponseEntity.ok()
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(fileName).build().toString())
                .body(content);
    }

    private static byte[] bytes(MultipartFile file) {
        if (file.isEmpty()) {
            throw new ValidationException("The file is empty");
        }
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read the uploaded file", e);
        }
    }
}
