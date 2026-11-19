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
        return read(zip, false);
    }

    /** Strict ZIP validation for the mass-registration standards. */
    public static Map<String, byte[]> readStrict(byte[] zip) {
        validateEndRecord(zip);
        return read(zip, true);
    }

    private static Map<String, byte[]> read(byte[] zip, boolean rejectDuplicateNames) {
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
                String fileName = name(e.getName());
                if (rejectDuplicateNames && files.containsKey(fileName)) {
                    throw new ValidationException("The ZIP contains more than one file named «" + fileName + "»");
                }
                files.put(fileName, bytes);
            }
        } catch (IOException e) {
            throw new ValidationException("The photos file is not a valid ZIP");
        }
        return files;
    }

    /** A valid archive must end with a complete ZIP end-of-central-directory record. */
    private static void validateEndRecord(byte[] zip) {
        int firstCandidate = Math.max(0, zip.length - 22 - 0xFFFF);
        for (int i = zip.length - 22; i >= firstCandidate; i--) {
            if ((zip[i] & 0xff) == 0x50 && (zip[i + 1] & 0xff) == 0x4b
                    && (zip[i + 2] & 0xff) == 0x05 && (zip[i + 3] & 0xff) == 0x06) {
                int commentLength = (zip[i + 20] & 0xff) | ((zip[i + 21] & 0xff) << 8);
                int diskNumber = (zip[i + 4] & 0xff) | ((zip[i + 5] & 0xff) << 8);
                int directoryDisk = (zip[i + 6] & 0xff) | ((zip[i + 7] & 0xff) << 8);
                int entriesOnDisk = (zip[i + 8] & 0xff) | ((zip[i + 9] & 0xff) << 8);
                int entriesTotal = (zip[i + 10] & 0xff) | ((zip[i + 11] & 0xff) << 8);
                if (i + 22 + commentLength == zip.length && diskNumber == 0 && directoryDisk == 0
                        && entriesOnDisk == entriesTotal) {
                    return;
                }
            }
        }
        throw new ValidationException("The photos file is not a valid ZIP");
    }
}
