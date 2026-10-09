package pe.edu.pucp.hesperides.shared.storage;

/** Una foto lista para guardar: reducida y su miniatura, ambas JPEG. */
public record ProcessedPhoto(byte[] full, byte[] thumbnail, String contentType) {
}
