package pe.edu.pucp.hesperides.modules.imports.service;

import pe.edu.pucp.hesperides.modules.imports.ImportAction;
import pe.edu.pucp.hesperides.modules.imports.PlannedLine;
import pe.edu.pucp.hesperides.modules.imports.csv.Issue;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportPreviewResponse;
import pe.edu.pucp.hesperides.modules.imports.features.FeaturePreview;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenPreview;

import java.time.LocalDateTime;
import java.util.List;
import java.util.function.Function;
import java.util.function.Predicate;

/** De la vista previa guardada a lo que ve la persona. */
final class PreviewMapper {

    private PreviewMapper() {
    }

    static ImportPreviewResponse toResponse(long batchId, String kind, SpecimenPreview p, LocalDateTime expires) {
        int unknownRows = p.unknownSpecies().stream().mapToInt(SpecimenPreview.SpeciesCount::rows).sum();
        return new ImportPreviewResponse(batchId, kind, p.rows().size() + unknownRows,
                count(p.rows(), r -> r.action() == ImportAction.CREATE), count(p.rows(), r -> r.action() == ImportAction.UPDATE),
                p.unknownSpecies().stream().map(s -> new ImportPreviewResponse.UnknownSpecies(s.name(), s.rows())).toList(),
                duplicates(p.rows(), r -> new ImportPreviewResponse.Duplicate(r.line(), r.draft().scientificName(),
                        r.speciesSlug(), r.duplicateOf(), round(r.duplicateDistanceM()))),
                issues(p.issues()), p.decimalComma(), p.canConfirm(), expires, List.of());
    }

    static ImportPreviewResponse toResponse(long batchId, String kind, FeaturePreview p, LocalDateTime expires) {
        return new ImportPreviewResponse(batchId, kind, p.rows().size(),
                count(p.rows(), r -> r.action() == ImportAction.CREATE), count(p.rows(), r -> r.action() == ImportAction.UPDATE),
                List.of(),
                duplicates(p.rows(), r -> new ImportPreviewResponse.Duplicate(r.line(), r.draft().name(), null,
                        r.duplicateOf(), round(r.duplicateDistanceM()))),
                issues(p.issues()), p.decimalComma(), p.canConfirm(), expires, List.of());
    }

    private static <T> int count(List<T> rows, Predicate<T> test) {
        return (int) rows.stream().filter(test).count();
    }

    private static <T extends PlannedLine> List<ImportPreviewResponse.Duplicate> duplicates(
            List<T> rows, Function<T, ImportPreviewResponse.Duplicate> map) {
        return rows.stream().filter(PlannedLine::isPossibleDuplicate).map(map).toList();
    }

    private static List<ImportPreviewResponse.Issue> issues(List<Issue> issues) {
        return issues.stream().map(i -> new ImportPreviewResponse.Issue(i.line(), i.column(), i.message())).toList();
    }

    private static double round(Double meters) {
        return Math.round(meters * 100) / 100.0;
    }
}
