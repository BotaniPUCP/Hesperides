package pe.edu.pucp.hesperides.shared.storage;

/**
 * Límites de subida, iguales por todo camino (SPEC-104 D-07): ZIP, formulario y
 * descarga de Drive. El frontend los repite en {@code lib/upload-limits.ts} para
 * avisar antes de enviar; el tamaño de la petición entera lo fija
 * {@code spring.servlet.multipart} en application.yml.
 */
public final class UploadLimits {

    private static final long MB = 1024L * 1024;

    public static final long MAX_PHOTO_BYTES = 25 * MB;

    /** El ZIP se descomprime en memoria: este tope protege el heap del backend (SPEC-104 D-09). */
    public static final long MAX_ZIP_UNCOMPRESSED_BYTES = 500 * MB;

    public static final String MAX_PHOTO_LABEL = "25 MB";

    public static final String MAX_ZIP_UNCOMPRESSED_LABEL = "500 MB";

    private UploadLimits() {
    }
}
