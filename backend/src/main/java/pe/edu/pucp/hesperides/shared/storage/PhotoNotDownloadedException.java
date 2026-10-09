package pe.edu.pucp.hesperides.shared.storage;

/**
 * El enlace era válido pero la foto no se pudo traer (archivo no público, red).
 * No es un error del CSV: la fila entra sin foto y la vista previa lo avisa.
 */
public class PhotoNotDownloadedException extends RuntimeException {

    public PhotoNotDownloadedException(String reason) {
        super(reason);
    }
}
