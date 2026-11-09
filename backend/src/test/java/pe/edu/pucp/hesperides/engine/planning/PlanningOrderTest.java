package pe.edu.pucp.hesperides.engine.planning;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static pe.edu.pucp.hesperides.engine.planning.PlanningState.*;

/** SPEC-203 §5.5 «Orden de la lista». */
class PlanningOrderTest {

    private static PlanningVerdict v(PlanningState state, Integer days) {
        return new PlanningVerdict(state, days, null, null, null, 0, null, null, null, null, null);
    }

    @Test
    void sigueElOrdenDeUrgencia() {
        var rows = new ArrayList<>(List.of(
                v(NOT_CONFIGURED, null), v(DONE_FOR_PERIOD, null), v(NOT_DUE, 19), v(NOT_DUE, 2),
                v(SCHEDULED, null), v(IN_PROGRESS, 16), v(DUE, 4), v(DUE, null), v(DUE, 0),
                v(OVERDUE, 2), v(OVERDUE, 4)));

        rows.sort(PlanningOrder.COMPARATOR);

        assertThat(rows).extracting(PlanningVerdict::state, PlanningVerdict::days).containsExactly(
                org.assertj.core.groups.Tuple.tuple(OVERDUE, 4), org.assertj.core.groups.Tuple.tuple(OVERDUE, 2),
                org.assertj.core.groups.Tuple.tuple(DUE, null), org.assertj.core.groups.Tuple.tuple(DUE, 0),
                org.assertj.core.groups.Tuple.tuple(DUE, 4), org.assertj.core.groups.Tuple.tuple(IN_PROGRESS, 16),
                org.assertj.core.groups.Tuple.tuple(SCHEDULED, null), org.assertj.core.groups.Tuple.tuple(NOT_DUE, 2),
                org.assertj.core.groups.Tuple.tuple(NOT_DUE, 19), org.assertj.core.groups.Tuple.tuple(DONE_FOR_PERIOD, null),
                org.assertj.core.groups.Tuple.tuple(NOT_CONFIGURED, null));
    }
}
