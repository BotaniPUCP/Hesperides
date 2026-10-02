package pe.edu.pucp.hesperides.modules.imports.specimens;

import pe.edu.pucp.hesperides.shared.exception.ValidationException;
import pe.edu.pucp.hesperides.shared.storage.UploadLimits;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * El ZIP de fotos que acompaña a un CSV: la columna {@code foto} nombra un
 * archivo de dentro. Se compara por nombre sin carpeta ni mayúsculas.
 */
public final class PhotoFiles {


    private PhotoFiles() {
    }

    public static String name(String path) {
        String normalized = path.replace('\\', '/');
        return normalized.substring(normalized.lastIndexOf('/') + 1).trim().toLowerCase(Locale.ROOT);
    }

    /** Nombre (en minúsculas) → contenido. Con límites: un ZIP no puede llenar la memoria. */
    public static Map<String, byte[]> read(byte[] zip) {
        Map<String, byte[]> files = new HashMap<>();
        long total = 0;
        try (ZipInputStream in = new ZipInputStream(new ByteArrayInputStream(zip))) {
            for (ZipEntry e = in.getNextEntry(); e != null; e = in.getNextEntry()) {
                if (e.isDirectory() || name(e.getName()).startsWith(".")) {
                    continue;
                }
                byte[] bytes = in.readNBytes((int) UploadLimits.MAX_PHOTO_BYTES + 1);
                if (bytes.length > UploadLimits.MAX_PHOTO_BYTES) {
                    throw new ValidationException("«" + e.getName() + "» in the ZIP is larger than " + UploadLimits.MAX_PHOTO_LABEL);
                }
                total += bytes.length;
                if (total > UploadLimits.MAX_ZIP_UNCOMPRESSED_BYTES) {
                    throw new ValidationException("The ZIP is larger than " + UploadLimits.MAX_ZIP_UNCOMPRESSED_LABEL + " once uncompressed");
                }
                files.put(name(e.getName()), bytes);
            }
        } catch (IOException e) {
            throw new ValidationException("The photos file is not a valid ZIP");
        }
        return files;
    }
}
