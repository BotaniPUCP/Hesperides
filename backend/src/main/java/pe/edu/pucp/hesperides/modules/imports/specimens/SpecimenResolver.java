package pe.edu.pucp.hesperides.modules.imports.specimens;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.engine.duplicates.DuplicateDetector;
import pe.edu.pucp.hesperides.engine.duplicates.DuplicateMatch;
import pe.edu.pucp.hesperides.engine.duplicates.Nearby;
import pe.edu.pucp.hesperides.modules.imports.repository.SpeciesNames;
import pe.edu.pucp.hesperides.modules.imports.repository.SpecimenLookupRepository;
import pe.edu.pucp.hesperides.modules.imports.repository.SpecimenLookupRepository.SpeciesRef;
import pe.edu.pucp.hesperides.modules.imports.ImportRules;
import pe.edu.pucp.hesperides.modules.imports.csv.Issue;
import pe.edu.pucp.hesperides.modules.imports.csv.PhotoReference;
import pe.edu.pucp.hesperides.modules.imports.ImportAction;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenPreview.PlannedRow;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenPreview.SpeciesCount;

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
            ImportAction action = d.code() == null ? ImportAction.CREATE : ImportAction.UPDATE;
            Optional<DuplicateMatch> dup = action == ImportAction.CREATE
                    ? DuplicateDetector.find(d.lat(), d.lon(), ref.slug(), ref.typeCode(), registered)
                    : Optional.empty();
            rows.add(new PlannedRow(d, action, ref.id(), ref.slug(),
                    dup.map(DuplicateMatch::code).orElse(null), dup.map(DuplicateMatch::distanceM).orElse(null)));
            if (action == ImportAction.CREATE) {
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
        if (!lookup.nearCampus(d.lat(), d.lon(), ImportRules.CAMPUS_MARGIN_M)) {
            issues.add(new Issue(d.line(), "latitud", "The point is outside the campus"));
        }
        PhotoReference.check(d.line(), d.photo(), zipFiles).ifPresent(issues::add);
    }
}
