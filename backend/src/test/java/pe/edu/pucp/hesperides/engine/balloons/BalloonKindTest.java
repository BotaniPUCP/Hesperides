package pe.edu.pucp.hesperides.engine.balloons;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** SPEC-113 §5.1 y §5.5: qué pide atención y quién gana cuando dos compiten. */
class BalloonKindTest {

    @Test
    void incidentsAndDueGardensAskForAttentionTheRestOnlyInform() {
        assertThat(BalloonKind.INCIDENT.attention()).isTrue();
        assertThat(BalloonKind.IRRIGATION_DUE.attention()).isTrue();
        assertThat(BalloonKind.INTERVENTION.attention()).isFalse();
        assertThat(BalloonKind.IRRIGATION.attention()).isFalse();
        assertThat(BalloonKind.RESERVATION.attention()).isFalse();
    }

    @Test
    void theOrderFollowsUrgencyNotKind() {
        List<String> ranked = new ArrayList<>(List.of(
                "RESERVATION/", "INTERVENTION/", "IRRIGATION/", "IRRIGATION_DUE/DUE", "INCIDENT/NONE",
                "INCIDENT/LOW", "IRRIGATION_DUE/OVERDUE", "INCIDENT/MEDIUM", "INCIDENT/HIGH"));
        ranked.sort(Comparator.comparingInt(key -> {
            String[] parts = key.split("/", -1);
            return BalloonKind.valueOf(parts[0]).rank(parts[1].isEmpty() ? null : parts[1]);
        }));

        assertThat(ranked).containsExactly("INCIDENT/HIGH", "INCIDENT/MEDIUM", "IRRIGATION_DUE/OVERDUE",
                "INCIDENT/LOW", "INCIDENT/NONE", "IRRIGATION_DUE/DUE", "IRRIGATION/", "INTERVENTION/",
                "RESERVATION/");
    }
}
