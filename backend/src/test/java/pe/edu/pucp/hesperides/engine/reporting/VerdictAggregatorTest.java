package pe.edu.pucp.hesperides.engine.reporting;

import org.junit.jupiter.api.Test;
import pe.edu.pucp.hesperides.engine.frequency.ComplianceStatus;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static pe.edu.pucp.hesperides.engine.frequency.ComplianceStatus.*;

/** SPEC-202 D-05: a place takes its most severe segment. */
class VerdictAggregatorTest {

    @Test
    void overdueWinsOverOnTarget() {
        assertThat(VerdictAggregator.mostSevere(List.of(ON_TARGET, OVERDUE))).isEqualTo(OVERDUE);
    }

    @Test
    void followsTheDeclaredOrder() {
        assertThat(VerdictAggregator.mostSevere(List.of(ON_TARGET, WITHIN_TOLERANCE))).isEqualTo(WITHIN_TOLERANCE);
        assertThat(VerdictAggregator.mostSevere(List.of(NOT_APPLICABLE, ON_TARGET))).isEqualTo(ON_TARGET);
        assertThat(VerdictAggregator.mostSevere(List.of(WITHIN_TOLERANCE, OVERDUE, ON_TARGET))).isEqualTo(OVERDUE);
    }

    @Test
    void notConfiguredCountsAsNotApplicable() {
        assertThat(VerdictAggregator.mostSevere(List.of(NOT_CONFIGURED))).isEqualTo(NOT_APPLICABLE);
        assertThat(VerdictAggregator.mostSevere(List.of(NOT_CONFIGURED, ON_TARGET))).isEqualTo(ON_TARGET);
    }

    @Test
    void withoutSegmentsThereIsNothingToJudge() {
        assertThat(VerdictAggregator.mostSevere(List.<ComplianceStatus>of())).isEqualTo(NOT_APPLICABLE);
    }
}
