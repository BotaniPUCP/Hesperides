package pe.edu.pucp.hesperides.modules.imports.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportPreviewResponse.Issue;
import pe.edu.pucp.hesperides.modules.imports.speciesphotos.SpeciesPhotoPreview.Planned;
import pe.edu.pucp.hesperides.modules.inventory.repository.SpeciesPhotoRepository;
import pe.edu.pucp.hesperides.modules.inventory.repository.SpeciesPhotoRepository.NewPhoto;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;
import pe.edu.pucp.hesperides.shared.audit.AuditService;
import pe.edu.pucp.hesperides.shared.storage.FileStorage;
import pe.edu.pucp.hesperides.shared.storage.StoredPhoto;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;

/**
 * Reemplaza el conjunto de fotos de una especie (SPEC-104 D-02). Es todo o nada
 * por especie: si una de sus fotos no se pudo guardar, la especie conserva las
 * anteriores y las nuevas que sí se guardaron se borran del almacenamiento, para
 * no dejar archivos que nada referencia. Corre dentro de la transacción de quien llama.
 */
@Component
@RequiredArgsConstructor
public class SpeciesPhotoSets {

    private final SpeciesPhotoRepository repository;
    private final FileStorage storage;
    private final AuditService audit;

    /**
     * @param set       las fotos de la especie, ya en su orden
     * @param stored    por línea, la foto guardada; falta la línea que no se pudo guardar
     * @param sourceUrl el enlace del que vino cada foto, o nulo
     * @return si el conjunto se reemplazó
     */
    public boolean replace(long speciesId, String slug, List<Planned> set, Map<Integer, StoredPhoto> stored,
                           Function<Planned, String> sourceUrl, long userId, List<Issue> warnings) {
        long missing = set.stream().filter(r -> !stored.containsKey(r.line())).count();
        if (missing > 0) {
            set.stream().map(r -> stored.get(r.line())).filter(Objects::nonNull).forEach(this::discard);
            warnings.add(new Issue(set.get(0).line(), "foto", "Species «" + slug + "» kept its previous photos: "
                    + missing + " of " + set.size() + " could not be saved"));
            return false;
        }
        repository.replaceSet(speciesId, set.stream().map(r -> new NewPhoto(stored.get(r.line()), sourceUrl.apply(r),
                r.author(), r.license(), r.sourcePage())).toList(), userId);
        audit.record(AuditActionCode.SPECIES_PHOTOS_REPLACED, "Species", speciesId, Map.of("photos", set.size()));
        return true;
    }

    private void discard(StoredPhoto photo) {
        storage.delete(photo.storageKey());
        storage.delete(photo.thumbnailKey());
    }
}
