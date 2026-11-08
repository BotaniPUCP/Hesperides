package pe.edu.pucp.hesperides.modules.directory.imports;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import pe.edu.pucp.hesperides.modules.directory.imports.ImportDtos.ImportOutcome;
import pe.edu.pucp.hesperides.modules.directory.imports.ImportDtos.ImportPlan;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

/** Registro masivo del Directorio por CSV: plantilla, vista previa y confirmación. Solo coordinación. */
@RestController
@RequestMapping("/api/v1/directory/imports")
@PreAuthorize("hasAnyAuthority('ADMIN', 'COORDINADOR')")
@RequiredArgsConstructor
public class DirectoryImportController {

    /** Una fila de ejemplo en cada plantilla: muestra el separador de listas y los tipos válidos. */
    private static final Map<String, String> EXAMPLES = Map.of(
            DirectoryImportService.ORGANIZATIONS, "Estudios Generales Ciencias;Unidad PUCP;;6262000;EEGGCC|EE.GG.CC.",
            DirectoryImportService.CONTACTS, "Juan Pérez;Estudios Generales Ciencias|OIE;4549;987654321;jperez@pucp.edu.pe");

    /** Excel en Windows solo reconoce un CSV como UTF-8 si empieza con esta marca. */
    private static final String UTF8_BOM = String.valueOf((char) 0xFEFF);

    private final DirectoryImportService imports;

    @GetMapping("/templates/{kind}")
    public ResponseEntity<byte[]> template(@PathVariable String kind) {
        String header = String.join(";", DirectoryImportService.columns(kind));
        byte[] body = (UTF8_BOM + header + "\n" + EXAMPLES.get(kind) + "\n").getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok().contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename("directorio-" + kind + ".csv").build().toString())
                .body(body);
    }

    @PostMapping(value = "/{kind}/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ImportPlan>> preview(@PathVariable String kind,
            @RequestPart("file") MultipartFile file) {
        return ResponseEntity.ok(ApiResponse.ok("Preview ready", imports.preview(kind, bytes(file))));
    }

    @PostMapping(value = "/{kind}/confirm", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ImportOutcome>> confirm(@PathVariable String kind,
            @RequestPart("file") MultipartFile file) {
        return ResponseEntity.ok(ApiResponse.ok("Import confirmed", imports.confirm(kind, bytes(file))));
    }

    private static byte[] bytes(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ValidationException("The file is empty");
        }
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read the uploaded file", e);
        }
    }
}
