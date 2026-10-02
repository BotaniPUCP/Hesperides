package pe.edu.pucp.hesperides.modules.imports.dto;

/** Una foto subida en un formulario, ya leída del multipart. */
public record UploadedPhoto(byte[] content, String fileName) {
}
