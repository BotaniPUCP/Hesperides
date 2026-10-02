package pe.edu.pucp.hesperides.modules.imports.csv;

import pe.edu.pucp.hesperides.modules.imports.specimens.PhotoFiles;
import pe.edu.pucp.hesperides.shared.storage.PhotoDownloader;

import java.util.Optional;
import java.util.Set;

/**
 * La celda {@code foto} de cualquier estándar: un enlace público de Google
 * Drive o el nombre de un archivo del ZIP. La vista previa solo valida; la
 * descarga ocurre al confirmar (SPEC-103 §3.1).
 */
public final class PhotoReference {

    private PhotoReference() {
    }

    public static boolean isLink(String photo) {
        return photo != null && (photo.startsWith("http://") || photo.startsWith("https://"));
    }

    /** @param zipFiles nombres de archivo (en minúsculas) del ZIP; vacío si no se subió */
    public static Optional<Issue> check(int line, String photo, Set<String> zipFiles) {
        if (photo == null) {
            return Optional.empty();
        }
        if (isLink(photo)) {
            // Un enlace fuera de Drive es un error de formato (SPEC-103 D-09).
            return PhotoDownloader.isAllowedHost(PhotoDownloader.downloadUrl(photo))
                    ? Optional.empty()
                    : Optional.of(new Issue(line, "foto", "Photo links must be public Google Drive links"));
        }
        return zipFiles.contains(PhotoFiles.name(photo))
                ? Optional.empty()
                : Optional.of(new Issue(line, "foto", "The file «" + photo + "» is not in the uploaded ZIP"));
    }
}
