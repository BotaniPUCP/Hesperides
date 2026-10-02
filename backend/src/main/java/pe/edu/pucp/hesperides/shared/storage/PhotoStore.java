package pe.edu.pucp.hesperides.shared.storage;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

/** Procesa una foto y guarda sus dos tamaños bajo una carpeta del almacenamiento. */
@Component
@RequiredArgsConstructor
public class PhotoStore {

    private final FileStorage storage;

    /** La carpeta agrupa por dueño (green-elements/EV-000001); el nombre es único. */
    public StoredPhoto save(String folder, byte[] original) {
        ProcessedPhoto photo = PhotoProcessor.process(original);
        String base = folder + "/" + UUID.randomUUID();
        String fullKey = base + ".jpg", thumbKey = base + "-thumb.jpg";
        storage.put(fullKey, photo.full(), photo.contentType());
        storage.put(thumbKey, photo.thumbnail(), photo.contentType());
        return new StoredPhoto(fullKey, thumbKey, photo.contentType(), photo.full().length);
    }
}
