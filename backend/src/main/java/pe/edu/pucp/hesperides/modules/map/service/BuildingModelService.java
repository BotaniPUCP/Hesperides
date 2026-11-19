package pe.edu.pucp.hesperides.modules.map.service;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * El modelo 3D de los edificios del plano y su manifiesto (SPEC-108 D-06). Los
 * dos son archivos generados que viajan dentro del jar y solo cambian con un
 * despliegue: se leen una vez, al crear el servicio. La etiqueta es la
 * {@code version} del manifiesto, que empieza con el hash del GLB y lleva un
 * sufijo cuando el manifiesto se corrige sin regenerar el GLB (el anclaje
 * corrido hacia los jardines, 14 nov 2026): así el navegador también descarta
 * el manifiesto viejo.
 */
@Service
public class BuildingModelService {

    private static final String MODEL = "mapa/edificios-plano.glb";
    private static final String MANIFEST = "mapa/edificios-plano.json";

    private final byte[] model;
    private final String etag;
    private final String manifestJson;

    public BuildingModelService() {
        this(read(MODEL), new String(read(MANIFEST), StandardCharsets.UTF_8));
    }

    BuildingModelService(byte[] model, String manifestJson) {
        this.model = model;
        this.manifestJson = manifestJson;
        this.etag = "\"" + versionOf(manifestJson, sha256(model)) + "\"";
    }

    /** Falla al arrancar si el manifiesto es de otro GLB: el visor ubicaría un modelo con el anclaje de otro. */
    private static String versionOf(String manifestJson, String modelHash) {
        String version = new ObjectMapper().readTree(manifestJson).path("version").asString("");
        if (!version.startsWith(modelHash)) {
            throw new IllegalStateException("El manifiesto de " + MANIFEST + " no corresponde al GLB: su versión «"
                    + version + "» no empieza con el hash del modelo");
        }
        return version;
    }

    /** El GLB tal cual. No se copia en cada petición: quien lo recibe no debe modificarlo. */
    public byte[] model() {
        return model;
    }

    /** {@code "<version del manifiesto>"} (el sha256 del GLB y su sufijo), con las comillas que exige la cabecera {@code ETag}. */
    public String etag() {
        return etag;
    }

    public String manifestJson() {
        return manifestJson;
    }

    private static byte[] read(String path) {
        try {
            return new ClassPathResource(path).getContentAsByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException("Falta en el build el archivo generado " + path, e);
        }
    }

    private static String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("La JVM no ofrece SHA-256", e);
        }
    }
}
