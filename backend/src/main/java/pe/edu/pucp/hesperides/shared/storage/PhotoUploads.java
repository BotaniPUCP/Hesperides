package pe.edu.pucp.hesperides.shared.storage;

import java.io.IOException;
import java.io.UncheckedIOException;
import org.springframework.web.multipart.MultipartFile;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

/** Lee una foto de un formulario con el mismo tope en todo el sistema (SPEC-104 D-07). */
public final class PhotoUploads {

    private PhotoUploads() {
    }

    /** Se mira el tamaño antes de leerla: así no entra en memoria una que se rechaza. */
    public static byte[] required(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ValidationException("The file is empty");
        }
        if (file.getSize() > UploadLimits.MAX_PHOTO_BYTES) {
            throw new ValidationException("The photo is larger than " + UploadLimits.MAX_PHOTO_LABEL);
        }
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read the uploaded file", e);
        }
    }
}
