package pe.edu.pucp.hesperides.engine.reporting;

import pe.edu.pucp.hesperides.engine.frequency.ComplianceStatus;

import java.util.Collection;
import java.util.List;

/**
 * The verdict of a place over a period is its most severe segment (SPEC-202
 * D-05). The report counts places, not segments: a place that was overdue once
 * is an overdue place, even if another segment of the period was on target.
 */
public final class VerdictAggregator {

    /** From most to least severe. NOT_CONFIGURED is folded into NOT_APPLICABLE. */
    private static final List<ComplianceStatus> SEVERITY = List.of(
            ComplianceStatus.OVERDUE,
            ComplianceStatus.EARLY,
            ComplianceStatus.ON_TARGET,
            ComplianceStatus.NOT_APPLICABLE);

    private VerdictAggregator() {
    }

    public static ComplianceStatus mostSevere(Collection<ComplianceStatus> statuses) {
        for (ComplianceStatus candidate : SEVERITY) {
            if (statuses.contains(candidate)) {
                return candidate;
            }
        }
        return ComplianceStatus.NOT_APPLICABLE;
    }
}
