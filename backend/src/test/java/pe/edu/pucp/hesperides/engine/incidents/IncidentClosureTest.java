package pe.edu.pucp.hesperides.engine.incidents;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static pe.edu.pucp.hesperides.engine.incidents.ClosureBlocker.*;

class IncidentClosureTest {

    @Test
    void activeIncidentWithAllLinkedWorkValidatedCanClose() {
        assertThat(IncidentClosure.blockers(true, List.of("VALIDATED", "VALIDATED"))).isEmpty();
    }

    @Test
    void inactiveIncidentCannotClose() {
        assertThat(IncidentClosure.blockers(false, List.of("VALIDATED"))).containsExactly(NOT_ACTIVE);
    }

    @Test
    void withoutLinkedWorkItCannotClose() {
        assertThat(IncidentClosure.blockers(true, List.of())).containsExactly(NO_LINKED_WORK);
    }

    @Test
    void completedButNotValidatedWorkBlocks() {
        assertThat(IncidentClosure.blockers(true, List.of("VALIDATED", "COMPLETED"))).containsExactly(WORK_NOT_VALIDATED);
    }

    @Test
    void cancelledWorkBlocksSeparatelySoTheScreenCanExplainIt() {
        assertThat(IncidentClosure.blockers(true, List.of("VALIDATED", "CANCELLED"))).containsExactly(CANCELLED_WORK);
    }

    @Test
    void reportsEveryBlockerAtOnce() {
        assertThat(IncidentClosure.blockers(false, List.of("CANCELLED", "IN_PROGRESS")))
                .containsExactly(NOT_ACTIVE, WORK_NOT_VALIDATED, CANCELLED_WORK);
    }
}
