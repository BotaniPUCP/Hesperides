package pe.edu.pucp.hesperides.modules.imports.service;

import pe.edu.pucp.hesperides.modules.imports.ImportAction;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportPreviewResponse;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenPreview;

import java.time.LocalDateTime;

/** De la vista previa guardada a lo que ve la persona. */
final class PreviewMapper {

    private PreviewMapper() {
    }

    static ImportPreviewResponse toResponse(long batchId, String kind, SpecimenPreview p, LocalDateTime expires) {
        int unknownRows = p.unknownSpecies().stream().mapToInt(SpecimenPreview.SpeciesCount::rows).sum();
        return new ImportPreviewResponse(batchId, kind,
                p.rows().size() + unknownRows,
                (int) p.rows().stream().filter(r -> r.action() == ImportAction.CREATE).count(),
                (int) p.rows().stream().filter(r -> r.action() == ImportAction.UPDATE).count(),
                p.unknownSpecies().stream().map(s -> new ImportPreviewResponse.UnknownSpecies(s.name(), s.rows())).toList(),
                p.rows().stream().filter(SpecimenPreview.PlannedRow::isPossibleDuplicate)
                        .map(r -> new ImportPreviewResponse.Duplicate(r.draft().line(), r.draft().scientificName(),
                                r.speciesSlug(), r.duplicateOf(), Math.round(r.duplicateDistanceM() * 100) / 100.0))
                        .toList(),
                p.issues().stream().map(i -> new ImportPreviewResponse.Issue(i.line(), i.column(), i.message())).toList(),
                p.decimalComma(), p.canConfirm(), expires);
    }
}
