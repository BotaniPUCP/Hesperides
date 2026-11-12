package pe.edu.pucp.hesperides.modules.places.controller;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import pe.edu.pucp.hesperides.modules.places.service.PlaceWorkbookImportService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

/** Plantilla, revisión y confirmación de la importación masiva de lugares. */
@RestController
@RequiredArgsConstructor
public class PlaceWorkbookImportController {

    private static final String EDITORS = PlaceController.EDITORS;
    private static final MediaType XLSX = MediaType.parseMediaType(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    private final PlaceWorkbookImportService imports;

    @GetMapping("/api/v1/places/import/template")
    @PreAuthorize(EDITORS)
    public ResponseEntity<byte[]> template() {
        return ResponseEntity.ok().contentType(XLSX)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename("plantilla-importar-lugares.xlsx").build().toString())
                .body(imports.template());
    }

    @PostMapping(value = "/api/v1/places/import/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize(EDITORS)
    public ResponseEntity<ApiResponse<PlaceWorkbookImportService.Preview>> preview(
            @RequestPart("file") MultipartFile file) {
        return ResponseEntity.ok(ApiResponse.ok("Place workbook preview", imports.preview(bytes(file), file.getOriginalFilename())));
    }

    @PostMapping(value = "/api/v1/places/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize(EDITORS)
    public ResponseEntity<ApiResponse<PlaceWorkbookImportService.ImportResult>> importWorkbook(
            @RequestPart("file") MultipartFile file,
            @RequestPart(value = "replacements", required = false) List<PlaceWorkbookImportService.Replacement> replacements,
            @AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(ApiResponse.ok("Places imported",
                imports.importWorkbook(bytes(file), file.getOriginalFilename(), principal.getUsername(), replacements)));
    }

    private static byte[] bytes(MultipartFile file) {
        if (file.isEmpty()) throw new ValidationException("El archivo Excel está vacío.");
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo leer el archivo Excel.", e);
        }
    }
}
