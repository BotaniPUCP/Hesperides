package pe.edu.pucp.hesperides.modules.places.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.pucp.hesperides.modules.places.dto.PlaceWorkbookExportRequest;
import pe.edu.pucp.hesperides.modules.places.service.PlaceWorkbookExportService;

@RestController
@RequiredArgsConstructor
public class PlaceWorkbookExportController {

    private static final MediaType XLSX = MediaType.parseMediaType(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    private final PlaceWorkbookExportService exports;

    @PostMapping(value = "/api/v1/places/export", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize(PlaceController.EDITORS)
    public ResponseEntity<byte[]> export(@RequestBody PlaceWorkbookExportRequest request) {
        return ResponseEntity.ok().contentType(XLSX)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename("exportar-lugares.xlsx").build().toString())
                .body(exports.export(request));
    }
}
