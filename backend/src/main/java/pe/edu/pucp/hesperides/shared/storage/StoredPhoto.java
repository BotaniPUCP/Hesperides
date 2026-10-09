package pe.edu.pucp.hesperides.shared.storage;

/** Las claves de una foto guardada: lo único que la base conoce de ella. */
public record StoredPhoto(String storageKey, String thumbnailKey, String contentType, long sizeBytes) {
}
