package pe.edu.pucp.hesperides.modules.map.service;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * El modelo 3D de los edificios del plano y su manifiesto (SPEC-108 D-06). Los
 * dos son archivos generados que viajan dentro del jar y solo cambian con un
 * despliegue: se leen una vez, al crear el servicio, y la etiqueta es el hash
 * del GLB, el mismo que el manifiesto declara como {@code version}.
 */
@Service
public class BuildingModelService {

    private static final String MODEL = "mapa/edificios-plano.glb";
    private static final String MANIFEST = "mapa/edificios-plano.json";

    private final byte[] model;
    private final String etag;
    private final String manifestJson;

    public BuildingModelService() {
        this.model = read(MODEL);
        this.etag = "\"" + sha256(model) + "\"";
        this.manifestJson = new String(read(MANIFEST), StandardCharsets.UTF_8);
    }

    /** El GLB tal cual. No se copia en cada petición: quien lo recibe no debe modificarlo. */
    public byte[] model() {
        return model;
    }

    /** {@code "<sha256 del GLB>"}, con las comillas que exige la cabecera {@code ETag}. */
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
