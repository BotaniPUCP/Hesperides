package pe.edu.pucp.hesperides.shared.storage;

import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;

/** La base apunta a un archivo que el almacenamiento no tiene. */
public class StoredFileNotFoundException extends ResourceNotFoundException {

    public StoredFileNotFoundException(String key) {
        super("Stored file not found: " + key);
    }
}
