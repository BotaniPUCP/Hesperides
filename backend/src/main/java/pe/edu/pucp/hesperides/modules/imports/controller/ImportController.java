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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import pe.edu.pucp.hesperides.modules.imports.dto.ConfirmImportRequest;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportPreviewResponse;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportConfirmationSummary;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportResultResponse;
import pe.edu.pucp.hesperides.modules.imports.service.CsvTemplates;
import pe.edu.pucp.hesperides.modules.imports.service.SpeciesExportService;
import pe.edu.pucp.hesperides.modules.imports.service.SpecimenExportService;
import pe.edu.pucp.hesperides.modules.imports.service.ImportService;
import pe.edu.pucp.hesperides.modules.imports.service.SpecimenImportService;
import pe.edu.pucp.hesperides.modules.imports.dto.SpeciesImportOption;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;

import java.nio.charset.StandardCharsets;

/** Carga de catastro por CSV en dos pasos: vista previa y confirmación (SPEC-103 §5.2). */
@RestController
@RequiredArgsConstructor
public class ImportController {

    private static final String LOADERS = "hasAnyAuthority('ADMIN', 'COORDINADOR')";

    private final ImportService imports;
    private final CsvTemplates templates;
    private final SpecimenExportService export;
    private final SpeciesExportService speciesExport;
    private final SpecimenImportService specimenImports;

    @PostMapping(value = "/api/v1/imports/{kind}/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize(LOADERS)
    public ResponseEntity<ApiResponse<ImportPreviewResponse>> preview(
            @PathVariable String kind, @RequestPart("file") MultipartFile csv, @RequestPart(value = "photos", required = false) MultipartFile zip,
            @RequestPart(value = "speciesBindings", required = false) java.util.Map<String, String> speciesBindings,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(ApiResponse.ok("Preview ready", imports.preview(kind, UploadedFiles.required(csv),
                csv.getOriginalFilename(), () -> optionalZip(kind, zip), speciesBindings, principal.getUsername())));
    }

    @PostMapping("/api/v1/imports/{batchId}/confirm")
    @PreAuthorize(LOADERS)
    public ResponseEntity<ApiResponse<ImportResultResponse>> confirm(
            @PathVariable long batchId, @RequestBody(required = false) ConfirmImportRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        ConfirmImportRequest body = request == null ? new ConfirmImportRequest(null, null, null) : request;
        return ResponseEntity.ok(ApiResponse.ok("Import confirmed",
                imports.confirm(batchId, body.decisions(), body.summaryFingerprint(), principal.getUsername())));
    }

    @PostMapping("/api/v1/imports/{batchId}/confirmation-summary")
    @PreAuthorize(LOADERS)
    public ResponseEntity<ApiResponse<ImportConfirmationSummary>> confirmationSummary(
            @PathVariable long batchId, @RequestBody(required = false) ConfirmImportRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        ConfirmImportRequest body = request == null ? new ConfirmImportRequest(null, null, null) : request;
        return ResponseEntity.ok(ApiResponse.ok("Confirmation summary ready",
                imports.confirmationSummary(batchId, body.decisions(), body.planFingerprint(), principal.getUsername())));
    }

    @PostMapping(value = "/api/v1/imports/{batchId}/reanalyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize(LOADERS)
    public ResponseEntity<ApiResponse<ImportPreviewResponse>> reanalyze(
            @PathVariable long batchId,
            @RequestPart("file") MultipartFile csv,
            @RequestPart(value = "photos", required = false) MultipartFile zip,
            @RequestPart(value = "speciesBindings", required = false) java.util.Map<String, String> speciesBindings,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(ApiResponse.ok("Preview updated", imports.reanalyze(batchId,
                UploadedFiles.required(csv), csv.getOriginalFilename(), optionalZip("specimens", zip),
                speciesBindings, principal.getUsername())));
    }

    @GetMapping("/api/v1/imports/specimens/species-options")
    @PreAuthorize(LOADERS)
    public ResponseEntity<ApiResponse<java.util.List<SpeciesImportOption>>> specimenSpeciesOptions(
            @RequestParam(defaultValue = "") String search) {
        return ResponseEntity.ok(ApiResponse.ok("Species options", specimenImports.speciesOptions(search)));
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

    @GetMapping("/api/v1/green-inventory/species/export.csv")
    @PreAuthorize(LOADERS)
    public ResponseEntity<byte[]> exportSpecies() {
        return csv("especies.csv", speciesExport.export());
    }

    private static ResponseEntity<byte[]> csv(String fileName, byte[] content) {
        return ResponseEntity.ok()
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(fileName).build().toString())
                .body(content);
    }

    private static byte[] optionalZip(String kind, MultipartFile zip) {
        if (zip == null) return null;
        return "specimens".equals(kind) || "species".equals(kind)
                ? UploadedFiles.required(zip)
                : UploadedFiles.optional(zip);
    }
}
