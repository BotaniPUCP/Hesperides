package pe.edu.pucp.hesperides.shared.storage;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.UUID;

/** Procesa una foto y guarda sus dos tamaños bajo una carpeta del almacenamiento. */
@Component
@Slf4j
@RequiredArgsConstructor
public class PhotoStore {

    private final FileStorage storage;

    /** La carpeta agrupa por dueño (green-elements/EV-000001); el nombre es único. */
    public StoredPhoto save(String folder, byte[] original) {
        ProcessedPhoto photo = PhotoProcessor.process(original);
        String base = folder + "/" + UUID.randomUUID();
        String fullKey = base + ".jpg", thumbKey = base + "-thumb.jpg";
        try {
            storage.put(fullKey, photo.full(), photo.contentType());
            storage.put(thumbKey, photo.thumbnail(), photo.contentType());
        } catch (RuntimeException failure) {
            deleteQuietly(fullKey);
            deleteQuietly(thumbKey);
            throw failure;
        }
        return new StoredPhoto(fullKey, thumbKey, photo.contentType(), photo.full().length);
    }

    private void deleteQuietly(String key) {
        try {
            storage.delete(key);
        } catch (RuntimeException cleanupError) {
            log.error("Could not remove a partially stored photo", cleanupError);
        }
    }
}
