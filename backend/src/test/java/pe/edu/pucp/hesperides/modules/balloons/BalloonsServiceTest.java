package pe.edu.pucp.hesperides.modules.balloons;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import pe.edu.pucp.hesperides.engine.balloons.BalloonKind;
import pe.edu.pucp.hesperides.engine.balloons.GeoPoint;
import pe.edu.pucp.hesperides.modules.balloons.dto.BalloonDtos.BalloonCard;
import pe.edu.pucp.hesperides.modules.balloons.dto.BalloonDtos.BalloonResponse;
import pe.edu.pucp.hesperides.modules.balloons.repository.SectorLocator;
import pe.edu.pucp.hesperides.modules.balloons.service.BalloonsService;
import pe.edu.pucp.hesperides.modules.balloons.source.BalloonDraft;
import pe.edu.pucp.hesperides.modules.balloons.source.BalloonSource;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** SPEC-113 §3.1 y §5.3: el servicio junta fuentes, parte en minigrupos y ordena. */
class BalloonsServiceTest {

    private static final GeoPoint HERE = new GeoPoint(-12.0690, -77.0790);
    private static final GeoPoint FAR = new GeoPoint(-12.0710, -77.0790);
    private static final BalloonCard CARD = new BalloonCard("t", "s", List.of(), null, null, "/x");

    private SectorLocator sectors;

    @BeforeEach
    void sectorsAnswerSeven() {
        sectors = mock(SectorLocator.class);
        when(sectors.sectorsOf(anyList())).thenAnswer(call ->
                new ArrayList<>(Collections.nCopies(((List<?>) call.getArgument(0)).size(), 7L)));
    }

    private BalloonsService service(List<BalloonSource> sources, int max) {
        return new BalloonsService(sources, List.of(), sectors, Clock.fixed(Instant.EPOCH, ZoneOffset.UTC), max);
    }

    private static BalloonSource source(BalloonKind kind, BalloonDraft... drafts) {
        return new BalloonSource() {
            public List<BalloonKind> kinds() {
                return List.of(kind);
            }

            public List<BalloonDraft> drafts() {
                return List.of(drafts);
            }
        };
    }

    private static BalloonSource broken(BalloonKind kind) {
        return new BalloonSource() {
            public List<BalloonKind> kinds() {
                return List.of(kind);
            }

            public List<BalloonDraft> drafts() {
                throw new IllegalStateException("caída");
            }
        };
    }

    @Test
    void aDispersedSetBecomesOneBalloonPerMiniGroupWithStableIds() {
        var draft = new BalloonDraft(BalloonKind.INTERVENTION, null, "9", CARD, List.of(HERE, FAR, HERE));

        var balloons = service(List.of(source(BalloonKind.INTERVENTION, draft)), 500).balloons().balloons();

        assertThat(balloons).extracting(BalloonResponse::id).containsExactly("INTERVENTION:9#1", "INTERVENTION:9#2");
        assertThat(balloons).extracting(BalloonResponse::memberCount).containsExactly(2, 1);
        assertThat(balloons).extracting(BalloonResponse::sectorId).containsOnly(7L);
    }

    @Test
    void aSingleGroupKeepsThePlainId() {
        var draft = new BalloonDraft(BalloonKind.INCIDENT, BalloonKind.HIGH, "4", CARD, List.of(HERE));

        var balloon = service(List.of(source(BalloonKind.INCIDENT, draft)), 500).balloons().balloons().getFirst();

        assertThat(balloon.id()).isEqualTo("INCIDENT:4");
        assertThat(balloon.attention()).isTrue();
    }

    @Test
    void aBrokenSourceDoesNotHideTheOthers() {
        var draft = new BalloonDraft(BalloonKind.INCIDENT, BalloonKind.LOW, "1", CARD, List.of(HERE));

        var response = service(List.of(broken(BalloonKind.RESERVATION), source(BalloonKind.INCIDENT, draft)), 500)
                .balloons();

        assertThat(response.balloons()).hasSize(1);
        assertThat(response.unavailableKinds()).containsExactly(BalloonKind.RESERVATION);
    }

    @Test
    void theMostUrgentComeFirstAndTheCapKeepsThem() {
        var reservation = new BalloonDraft(BalloonKind.RESERVATION, null, "R", CARD, List.of(HERE));
        var low = new BalloonDraft(BalloonKind.INCIDENT, BalloonKind.LOW, "2", CARD, List.of(HERE));
        var high = new BalloonDraft(BalloonKind.INCIDENT, BalloonKind.HIGH, "3", CARD, List.of(HERE));

        var response = service(List.of(source(BalloonKind.RESERVATION, reservation),
                source(BalloonKind.INCIDENT, low, high)), 2).balloons();

        assertThat(response.balloons()).extracting(BalloonResponse::id).containsExactly("INCIDENT:3", "INCIDENT:2");
        assertThat(response.truncated()).isTrue();
    }

    @Test
    void aDraftWithoutAnchorsHasNoBalloon() {
        var draft = new BalloonDraft(BalloonKind.INTERVENTION, null, "5", CARD, List.of());

        assertThat(service(List.of(source(BalloonKind.INTERVENTION, draft)), 500).balloons().balloons()).isEmpty();
    }
}
