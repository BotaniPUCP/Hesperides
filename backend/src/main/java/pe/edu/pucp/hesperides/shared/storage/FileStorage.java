package pe.edu.pucp.hesperides.shared.storage;

import java.net.URI;
import java.util.Optional;

/**
 * Dónde viven los archivos (SPEC-002 §5.4): un directorio en desarrollo y
 * on-premise, un bucket S3 privado en AWS. La base de datos guarda solo la
 * clave; el binario nunca entra a PostgreSQL.
 */
public interface FileStorage {

    void put(String key, byte[] content, String contentType);

    byte[] read(String key);

    void delete(String key);

    /**
     * Una URL de vida corta para que el navegador lea el archivo sin pasar por
     * el backend. Vacía cuando el backend debe servirlo él mismo.
     */
    Optional<URI> directUrl(String key);
}
