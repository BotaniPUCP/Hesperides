package pe.edu.pucp.hesperides.modules.inventory.service;

/**
 * Qué foto se muestra. La guardada en nuestro almacenamiento gana siempre; el
 * enlace de Drive del catastro solo se usa mientras no se haya descargado
 * (SPEC-103 D-07). Las rutas son relativas a la API: el frontend les antepone
 * su dirección del backend.
 */
final class PhotoUrls {

    private PhotoUrls() {
    }

    static String specimen(Long attachmentId, String sourceUrl, boolean thumbnail) {
        if (attachmentId != null) {
            return "/files/green-elements/" + attachmentId + (thumbnail ? "?size=thumb" : "?size=full");
        }
        return DrivePhotoLinks.thumbnail(sourceUrl);
    }

    /** La genérica de la especie; si no hay, la de uno de sus ejemplares (SPEC-103 D-08). */
    static String species(Long speciesPhotoId, Long specimenPhotoId, String specimenSourceUrl) {
        if (speciesPhotoId != null) {
            return "/files/species/" + speciesPhotoId + "?size=thumb";
        }
        return specimen(specimenPhotoId, specimenSourceUrl, true);
    }
}
