package pe.edu.pucp.hesperides.modules.inventory.service;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Las fotos del catastro son enlaces de Google Drive para «ver» el archivo, que
 * no sirven como imagen. Su miniatura sí, mientras el archivo esté compartido
 * públicamente (docs/inventario-verde/README.md, D-9).
 */
public final class DrivePhotoLinks {

    private static final Pattern FILE_ID = Pattern.compile("drive\\.google\\.com/(?:file/d/|open\\?id=)([\\w-]+)");
    private static final String THUMBNAIL = "https://drive.google.com/thumbnail?id=%s&sz=w1000";

    private DrivePhotoLinks() {
    }

    /** La miniatura de un enlace de Drive; cualquier otro enlace se devuelve tal cual. */
    public static String thumbnail(String link) {
        if (link == null || link.isBlank()) {
            return null;
        }
        Matcher matcher = FILE_ID.matcher(link);
        return matcher.find() ? THUMBNAIL.formatted(matcher.group(1)) : link;
    }
}
