package pe.edu.pucp.hesperides.modules.inventory.service;

/**
 * Qué foto se muestra. La guardada en nuestro almacenamiento gana siempre; el
 * enlace de Drive del catastro solo se usa mientras no se haya descargado
 * (SPEC-103 D-07). Las rutas son relativas a la API: el frontend les antepone
 * su dirección del backend.
 */
final class PhotoUrls {

    static final String FROM_SPECIES = "SPECIES";
    static final String FROM_SPECIMEN = "SPECIMEN";

    private PhotoUrls() {
    }

    static String specimen(Long attachmentId, String sourceUrl, boolean thumbnail) {
        if (attachmentId != null) {
            return "/files/green-elements/" + attachmentId + (thumbnail ? "?size=thumb" : "?size=full");
        }
        return DrivePhotoLinks.thumbnail(sourceUrl);
    }

    static String speciesPhoto(long photoId, boolean thumbnail) {
        return "/files/species/" + photoId + (thumbnail ? "?size=thumb" : "?size=full");
    }

    /** La principal de la especie; si no hay, la de uno de sus ejemplares (SPEC-103 D-08). */
    static String species(Long speciesPhotoId, Long specimenPhotoId, String specimenSourceUrl) {
        if (speciesPhotoId != null) {
            return speciesPhoto(speciesPhotoId, true);
        }
        return specimen(specimenPhotoId, specimenSourceUrl, true);
    }

    /** De dónde sale la foto principal: decide la etiqueta de la ficha. */
    static String speciesSource(Long speciesPhotoId, Long specimenPhotoId, String specimenSourceUrl) {
        if (speciesPhotoId != null) {
            return FROM_SPECIES;
        }
        return specimenPhotoId != null || specimenSourceUrl != null ? FROM_SPECIMEN : null;
    }
}
