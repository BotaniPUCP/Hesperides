package pe.edu.pucp.hesperides.modules.map.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ETag;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.pucp.hesperides.modules.map.dto.BuildingModelManifest;
import pe.edu.pucp.hesperides.modules.map.dto.DescribeLocationRequest;
import pe.edu.pucp.hesperides.modules.map.dto.LocationDescriptionResponse;
import pe.edu.pucp.hesperides.modules.map.dto.MapLayersResponse;
import pe.edu.pucp.hesperides.modules.map.dto.MapVersionResponse;
import pe.edu.pucp.hesperides.modules.map.service.BuildingModelService;
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
    static final int LAYERS_FORMAT = 3;

    private static final MediaType GLTF_BINARY = new MediaType("model", "gltf-binary");

    private final MapLayersService layersService;
    private final LocationDescriptionService descriptionService;
    private final BuildingModelService modelService;

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

    /**
     * El GLB del plano (SPEC-108 D-06). Va sin el sobre porque es un binario; los
     * errores sí lo llevan. Solo cambia con un despliegue, así que su etiqueta es
     * el hash del archivo y no la versión de datos de las capas.
     *
     * La etiqueta es débil: Tomcat no comprime una respuesta con ETag fuerte, y con
     * gzip el GLB baja de 7,6 MB a 1,8 MB. Es además lo correcto: comprimido o no,
     * los bytes cambian pero el modelo es el mismo.
     */
    @GetMapping("/models/buildings")
    @PreAuthorize(READERS)
    public ResponseEntity<byte[]> buildingModel(
            @RequestHeader(value = HttpHeaders.IF_NONE_MATCH, required = false) String ifNoneMatch) {
        String etag = "W/" + modelService.etag();
        if (matchesWeakly(ifNoneMatch, ETag.create(etag))) {
            return ResponseEntity.status(HttpStatus.NOT_MODIFIED).eTag(etag).build();
        }
        return ResponseEntity.ok()
                .contentType(GLTF_BINARY)
                .eTag(etag)
                .cacheControl(CacheControl.noCache())
                .body(modelService.model());
    }

    /** Comparación débil (RFC 9110 §13.1.2): con o sin {@code W/}, es la misma etiqueta. */
    private static boolean matchesWeakly(String ifNoneMatch, ETag current) {
        return ifNoneMatch != null && ETag.parse(ifNoneMatch).stream()
                .anyMatch(candidate -> candidate.isWildcard() || candidate.compare(current, false));
    }

    /**
     * El manifiesto (unos 225 kB) se pide en cada visita para comparar su
     * {@code version} con el modelo ya leído. Con su etiqueta y {@code no-cache}
     * el navegador lo guarda y lo revalida: si no cambió, responde 304 sin cuerpo
     * y el navegador entrega su copia. La etiqueta es la del GLB, la misma que el
     * manifiesto declara como {@code version}; la comparación es débil, como la del GLB.
     */
    @GetMapping("/models/buildings/manifest")
    @PreAuthorize(READERS)
    public ResponseEntity<ApiResponse<BuildingModelManifest>> buildingModelManifest(
            @RequestHeader(value = HttpHeaders.IF_NONE_MATCH, required = false) String ifNoneMatch) {
        String etag = modelService.etag();
        if (matchesWeakly(ifNoneMatch, ETag.create(etag))) {
            return ResponseEntity.status(HttpStatus.NOT_MODIFIED).eTag(etag).build();
        }
        return ResponseEntity.ok()
                .eTag(etag)
                .cacheControl(CacheControl.noCache())
                .body(ApiResponse.ok("Manifiesto del modelo obtenido",
                        new BuildingModelManifest(modelService.manifestJson())));
    }

    @PostMapping("/describe")
    @PreAuthorize(READERS)
    public ResponseEntity<ApiResponse<LocationDescriptionResponse>> describe(
            @Valid @RequestBody DescribeLocationRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Ubicación descrita",
                descriptionService.describe(request.lat(), request.lon())));
    }
}
