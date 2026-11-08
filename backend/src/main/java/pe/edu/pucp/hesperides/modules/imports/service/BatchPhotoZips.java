package pe.edu.pucp.hesperides.modules.imports.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.imports.specimens.PhotoFiles;
import pe.edu.pucp.hesperides.shared.storage.FileStorage;

import java.util.Map;

/**
 * El ZIP de fotos de un lote, solo en las cargas del catastro que lo usan. Espera
 * a la confirmación en el almacenamiento, no en la base.
 */
@Component
@RequiredArgsConstructor
public class BatchPhotoZips {

    private final FileStorage storage;

    /** Sin ZIP no se guarda nada: las fotos pueden venir por enlace. */
    public void keep(long batchId, byte[] zip) {
        if (zip != null) {
            storage.put(key(batchId), zip, "application/zip");
        }
    }

    public Map<String, byte[]> read(long batchId, boolean needed) {
        return needed ? PhotoFiles.read(storage.read(key(batchId))) : Map.of();
    }

    static String key(long batchId) {
        return "imports/" + batchId + "/photos.zip";
    }
}
