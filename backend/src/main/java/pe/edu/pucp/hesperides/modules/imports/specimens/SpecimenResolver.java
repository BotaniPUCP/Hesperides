package pe.edu.pucp.hesperides.modules.imports.specimens;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.engine.duplicates.DuplicateDetector;
import pe.edu.pucp.hesperides.engine.duplicates.DuplicateMatch;
import pe.edu.pucp.hesperides.engine.duplicates.Nearby;
import pe.edu.pucp.hesperides.modules.imports.repository.SpeciesNames;
import pe.edu.pucp.hesperides.modules.imports.repository.SpecimenLookupRepository;
import pe.edu.pucp.hesperides.modules.imports.repository.SpecimenLookupRepository.SpeciesRef;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenCsvSchema.Issue;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenPreview.Action;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenPreview.PlannedRow;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenPreview.SpeciesCount;
import pe.edu.pucp.hesperides.shared.storage.PhotoDownloader;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Cruza los borradores con la base (SPEC-103 D-04): especie, código, campus,
 * foto y duplicados. No escribe nada.
 */
@Component
@RequiredArgsConstructor
public class SpecimenResolver {

    /**
     * El límite del campus viene de OpenStreetMap y no es exacto: plantas reales
     * de la Pista de Salud caen hasta 10 m fuera. El chequeo busca coordenadas
     * erradas (invertidas o con un dígito de más), que caen mucho más lejos.
     */
    static final double CAMPUS_MARGIN_M = 15.0;

    private final SpecimenLookupRepository lookup;

    /** @param zipFiles nombres de archivo (en minúsculas) del ZIP de fotos; vacío si no se subió */
    public SpecimenPreview resolve(SpecimenCsvSchema.Parsed parsed, Set<String> zipFiles) {
        Map<String, SpeciesRef> species = lookup.speciesByName();
        Set<String> codes = lookup.existingCodes();
        List<Nearby> registered = new ArrayList<>(lookup.registeredPlants());
        List<Issue> issues = new ArrayList<>(parsed.issues());
        Map<String, Integer> unknown = new LinkedHashMap<>();
        List<PlannedRow> rows = new ArrayList<>();

        for (SpecimenDraft d : parsed.drafts()) {
            SpeciesRef ref = species.get(SpeciesNames.key(d.scientificName()));
            if (ref == null) {
                unknown.merge(d.scientificName().trim(), 1, Integer::sum);
                continue;
            }
            int before = issues.size();
            check(d, codes, zipFiles, issues);
            if (issues.size() > before) {
                continue;
            }
            Action action = d.code() == null ? Action.CREATE : Action.UPDATE;
            Optional<DuplicateMatch> dup = action == Action.CREATE
                    ? DuplicateDetector.find(d.lat(), d.lon(), ref.slug(), ref.typeCode(), registered)
                    : Optional.empty();
            rows.add(new PlannedRow(d, action, ref.id(), ref.slug(),
                    dup.map(DuplicateMatch::code).orElse(null), dup.map(DuplicateMatch::distanceM).orElse(null)));
            if (action == Action.CREATE) {
                // Dos filas del mismo archivo también pueden ser la misma planta.
                registered.add(new Nearby("fila " + d.line(), ref.slug(), d.lat(), d.lon()));
            }
        }
        List<SpeciesCount> unknownSpecies = unknown.entrySet().stream()
                .map(e -> new SpeciesCount(e.getKey(), e.getValue())).toList();
        return new SpecimenPreview(parsed.decimalComma(), rows, unknownSpecies, issues);
    }

    private void check(SpecimenDraft d, Set<String> codes, Set<String> zipFiles, List<Issue> issues) {
        if (d.code() != null && !codes.contains(d.code())) {
            issues.add(new Issue(d.line(), "codigo", "Code does not exist. Leave it empty to create a new specimen"));
        }
        if (!lookup.nearCampus(d.lat(), d.lon(), CAMPUS_MARGIN_M)) {
            issues.add(new Issue(d.line(), "latitud", "The point is outside the campus"));
        }
        String photo = d.photo();
        if (photo == null) {
            return;
        }
        if (photo.startsWith("http://") || photo.startsWith("https://")) {
            // Un enlace fuera de Drive es un error de formato (SPEC-103 D-09).
            if (!PhotoDownloader.isAllowedHost(PhotoDownloader.downloadUrl(photo))) {
                issues.add(new Issue(d.line(), "foto", "Photo links must be public Google Drive links"));
            }
        } else if (!zipFiles.contains(PhotoFiles.name(photo))) {
            issues.add(new Issue(d.line(), "foto", "The file «" + photo + "» is not in the uploaded ZIP"));
        }
    }
}
