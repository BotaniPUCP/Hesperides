package pe.edu.pucp.hesperides.modules.imports.features;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.engine.duplicates.DuplicateDetector;
import pe.edu.pucp.hesperides.engine.duplicates.DuplicateMatch;
import pe.edu.pucp.hesperides.engine.duplicates.Nearby;
import pe.edu.pucp.hesperides.modules.imports.ImportAction;
import pe.edu.pucp.hesperides.modules.imports.ImportRules;
import pe.edu.pucp.hesperides.modules.imports.csv.Issue;
import pe.edu.pucp.hesperides.modules.imports.csv.PhotoReference;
import pe.edu.pucp.hesperides.modules.imports.features.FeaturePreview.PlannedFeature;
import pe.edu.pucp.hesperides.modules.imports.repository.FeatureLookupRepository;
import pe.edu.pucp.hesperides.modules.imports.repository.SpecimenLookupRepository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/** Cruza los tachos o bebederos leídos con la base: código, campus, foto y duplicados. No escribe. */
@Component
@RequiredArgsConstructor
public class FeatureResolver {

    private final FeatureLookupRepository features;
    private final SpecimenLookupRepository places;

    public FeaturePreview resolve(FeatureKind kind, FeatureCsvSchema.Parsed parsed, Set<String> zipFiles) {
        Set<String> codes = features.codes(kind.typeCode());
        List<Nearby> registered = new ArrayList<>(features.registered(kind.typeCode()));
        List<Issue> issues = new ArrayList<>(parsed.issues());
        List<PlannedFeature> rows = new ArrayList<>();
        for (FeatureDraft d : parsed.drafts()) {
            int before = issues.size();
            check(d, codes, zipFiles, issues);
            if (issues.size() > before) {
                continue;
            }
            ImportAction action = d.code() == null ? ImportAction.CREATE : ImportAction.UPDATE;
            Optional<DuplicateMatch> dup = action == ImportAction.CREATE
                    ? DuplicateDetector.findFeature(d.lat(), d.lon(), registered) : Optional.empty();
            rows.add(new PlannedFeature(d, action, dup.map(DuplicateMatch::code).orElse(null),
                    dup.map(DuplicateMatch::distanceM).orElse(null)));
            if (action == ImportAction.CREATE) {
                // Dos filas del mismo archivo también pueden ser el mismo tacho.
                registered.add(new Nearby("fila " + d.line(), "", d.lat(), d.lon()));
            }
        }
        return new FeaturePreview(kind, parsed.decimalComma(), rows, issues);
    }

    private void check(FeatureDraft d, Set<String> codes, Set<String> zipFiles, List<Issue> issues) {
        if (d.code() != null && !codes.contains(d.code())) {
            issues.add(new Issue(d.line(), "codigo", "Code does not exist. Leave it empty to create a new one"));
        }
        if (!places.nearCampus(d.lat(), d.lon(), ImportRules.CAMPUS_MARGIN_M)) {
            issues.add(new Issue(d.line(), "latitud", "The point is outside the campus"));
        }
        PhotoReference.check(d.line(), d.photo(), zipFiles).ifPresent(issues::add);
    }
}
