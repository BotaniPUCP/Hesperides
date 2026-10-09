package pe.edu.pucp.hesperides.modules.imports.controller;

import org.springframework.web.multipart.MultipartFile;
import pe.edu.pucp.hesperides.modules.imports.dto.UploadedPhoto;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;
import pe.edu.pucp.hesperides.shared.storage.PhotoUploads;

import java.io.IOException;
import java.io.UncheckedIOException;

/** Lee los archivos de un multipart: uno obligatorio falla si viene vacío. */
final class UploadedFiles {

    private UploadedFiles() {
    }

    static byte[] required(MultipartFile file) {
        byte[] content = optional(file);
        if (content == null) {
            throw new ValidationException("The file is empty");
        }
        return content;
    }

    /** @return el contenido, o null si no se subió nada */
    static byte[] optional(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return null;
        }
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read the uploaded file", e);
        }
    }

    /** @return la foto con su nombre, o null si no se subió nada */
    static UploadedPhoto photo(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return null;
        }
        return new UploadedPhoto(requiredPhoto(file), file.getOriginalFilename());
    }

    /** Una foto de formulario tiene el mismo tope que una del ZIP (SPEC-104 D-07). */
    static byte[] requiredPhoto(MultipartFile file) {
        return PhotoUploads.required(file);
    }
}
