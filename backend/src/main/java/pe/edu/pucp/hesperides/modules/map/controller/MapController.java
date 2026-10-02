package pe.edu.pucp.hesperides.modules.map.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.pucp.hesperides.modules.map.dto.DescribeLocationRequest;
import pe.edu.pucp.hesperides.modules.map.dto.LocationDescriptionResponse;
import pe.edu.pucp.hesperides.modules.map.dto.MapLayersResponse;
import pe.edu.pucp.hesperides.modules.map.dto.MapVersionResponse;
import pe.edu.pucp.hesperides.modules.map.service.LocationDescriptionService;
import pe.edu.pucp.hesperides.modules.map.service.MapLayersService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/map")
public class MapController {

    /** Los cuatro roles ven el mapa: el operario es quien más lo usa en campo. */
    private static final String READERS = "hasAnyAuthority('ADMIN', 'COORDINADOR', 'SUPERVISOR', 'OPERARIO')";

    /**
     * Versión de la forma de /layers. La etiqueta combina datos y formato: si
     * solo llevara la versión de datos, una copia guardada antes de un cambio de
     * forma (la capa de vegetación, por ejemplo) recibiría 304 y el visor
     * fallaría al leerla. Se incrementa cada vez que cambian las capas o sus campos.
     */
    static final int LAYERS_FORMAT = 2;

    private final MapLayersService layersService;
    private final LocationDescriptionService descriptionService;

    @GetMapping("/version")
    @PreAuthorize(READERS)
    public ResponseEntity<ApiResponse<MapVersionResponse>> version() {
        return ResponseEntity.ok(ApiResponse.ok("Versión del mapa obtenida",
                new MapVersionResponse(layersService.currentVersion())));
    }

    /**
     * Con {@code If-None-Match} igual a la versión vigente responde 304 sin cuerpo:
     * el visor sigue con su copia. La comparación se hace antes de armar las capas.
     */
    @GetMapping("/layers")
    @PreAuthorize(READERS)
    public ResponseEntity<ApiResponse<MapLayersResponse>> layers(
            @RequestHeader(value = HttpHeaders.IF_NONE_MATCH, required = false) String ifNoneMatch) {
        String etag = etag(layersService.currentVersion());
        if (etag.equals(ifNoneMatch)) {
            return ResponseEntity.status(HttpStatus.NOT_MODIFIED).eTag(etag).build();
        }
        MapLayersResponse layers = layersService.layers();
        return ResponseEntity.ok()
                .eTag(etag(layers.version()))
                .cacheControl(CacheControl.noCache())
                .body(ApiResponse.ok("Capas del mapa obtenidas", layers));
    }

    private static String etag(long dataVersion) {
        return "\"" + dataVersion + "-f" + LAYERS_FORMAT + "\"";
    }

    @PostMapping("/describe")
    @PreAuthorize(READERS)
    public ResponseEntity<ApiResponse<LocationDescriptionResponse>> describe(
            @Valid @RequestBody DescribeLocationRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Ubicación descrita",
                descriptionService.describe(request.lat(), request.lon())));
    }
}
