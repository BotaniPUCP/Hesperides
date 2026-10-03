package pe.edu.pucp.hesperides.shared.storage;

import java.time.Duration;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

/** Entrega un archivo guardado: en S3 redirige a una URL prefirmada; en local, el backend lo sirve. */
public final class StoredFileResponses {

    private StoredFileResponses() {
    }

    public static ResponseEntity<byte[]> serve(FileStorage storage, String key, String contentType) {
        return storage.directUrl(key)
                .map(url -> ResponseEntity.status(HttpStatus.FOUND).location(url).<byte[]>build())
                // Una foto guardada no cambia: su clave es única, así que se puede cachear.
                .orElseGet(() -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .cacheControl(CacheControl.maxAge(Duration.ofDays(30)).cachePublic())
                        .body(storage.read(key)));
    }
}
