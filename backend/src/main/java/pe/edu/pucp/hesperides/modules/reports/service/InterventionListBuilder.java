package pe.edu.pucp.hesperides.modules.reports.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.reports.dto.ReportInterventionRow;
import pe.edu.pucp.hesperides.modules.reports.dto.TopList;
import pe.edu.pucp.hesperides.modules.reports.repository.CoverageQueries;
import pe.edu.pucp.hesperides.modules.reports.repository.CoverageQueries.SectionRef;
import pe.edu.pucp.hesperides.modules.reports.repository.InterventionListQueries;
import pe.edu.pucp.hesperides.modules.reports.repository.InterventionListQueries.WorkRow;
import pe.edu.pucp.hesperides.modules.reports.repository.ReportFilter;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import java.util.List;
import java.util.Set;

/**
 * The works behind a figure of the weekly or monthly report (SPEC-202 D-20,
 * §3.7). It takes the filter already validated as the monthly one, and the same
 * denominator the figure used, so the list matches the figure it opens.
 *
 * <p>The list kind is a closed set of codes, like {@code scope}: each exists
 * because the report computes that figure, so it is not a catalog (INV-2).
 */
@Component
@RequiredArgsConstructor
public class InterventionListBuilder {

    public static final String APPROVED = "APPROVED";
    public static final String PENDING_APPROVAL = "PENDING_APPROVAL";
    public static final String PENDING_PHOTOS = "PENDING_PHOTOS";
    public static final String ATTENDED_SECTION = "ATTENDED_SECTION";
    static final Set<String> KINDS = Set.of(APPROVED, PENDING_APPROVAL, PENDING_PHOTOS, ATTENDED_SECTION);

    /** Same cap as the weekly work table (D-11). */
    static final int CAP = 50;

    private final CoverageQueries coverage;
    private final InterventionListQueries works;

    /** 400 for an unknown kind, or for ATTENDED_SECTION without a section. Checked before the filter. */
    static void checkKind(String kind, Long sectionId) {
        if (kind == null || !KINDS.contains(kind)) {
            throw new ValidationException("Indica qué intervenciones listar");
        }
        if (ATTENDED_SECTION.equals(kind) && sectionId == null) {
            throw new ValidationException("Elige la sección");
        }
    }

    public TopList<ReportInterventionRow> build(String kind, ReportFilter filter) {
        List<Long> sections = coverage.denominator(filter).stream().map(SectionRef::sectionId).toList();
        List<WorkRow> rows = switch (kind) {
            case APPROVED -> works.approved(filter, sections);
            case PENDING_APPROVAL -> works.pendingApproval(filter, sections);
            case PENDING_PHOTOS -> works.withPendingPhotos(filter, sections);
            case ATTENDED_SECTION -> works.attendedSection(filter, filter.sectionId());
            default -> throw new ValidationException("Indica qué intervenciones listar");
        };
        return TopList.of(rows.stream().map(InterventionListBuilder::row).toList(), CAP);
    }

    private static ReportInterventionRow row(WorkRow w) {
        return new ReportInterventionRow(w.id(), w.code(), w.classLabel(), w.typeLabel(), w.teamName(),
                w.lastExecutionDate(), w.pendingPhotos());
    }
}
