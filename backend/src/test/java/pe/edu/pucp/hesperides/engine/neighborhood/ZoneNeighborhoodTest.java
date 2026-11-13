package pe.edu.pucp.hesperides.engine.neighborhood;

import org.junit.jupiter.api.Test;
import java.util.*;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import static org.assertj.core.api.Assertions.*;

class ZoneNeighborhoodTest {
    private static final Set<Long> ZONES = Set.of(1L, 2L, 3L, 4L, 5L);

    private ZoneNeighborhood graph() {
        return new ZoneNeighborhood("a", "a", ZONES,
                Map.of(10L, Set.of(1L, 2L), 20L, Set.of(2L, 3L)));
    }

    @Test void returnsOnlyDirectAssociationsInStableOrder() {
        assertThat(graph().eligible(10L)).containsExactly(1L, 2L);
    }

    @Test void aSharedZoneDoesNotImportTheOtherPlacesAssociations() {
        graph().requireAllowed(10L, List.of(2L));
        assertThatIllegalArgumentException().isThrownBy(() -> graph().requireAllowed(10L, List.of(2L, 3L)));
        assertThat(graph().eligible(10L)).containsExactly(1L, 2L);
    }

    @Test void changingThePlaceChangesTheAllowedZones() {
        assertThat(graph().eligible(20L)).containsExactly(2L, 3L);
        assertThatIllegalArgumentException().isThrownBy(() -> graph().requireAllowed(20L, List.of(1L)));
    }

    @Test void anUnreviewedPlaceDoesNotReceiveAnEmptySuccessfulResult() {
        assertThatIllegalStateException().isThrownBy(() -> graph().eligible(99L));
    }

    @Test void aReviewedEmptyAssociationCannotAcceptAnyZone() {
        var graph = new ZoneNeighborhood("a", "a", ZONES, Map.of(10L, Set.of()));
        assertThat(graph.eligible(10L)).isEmpty();
        assertThatIllegalArgumentException().isThrownBy(() -> graph.requireAllowed(10L, List.of(1L)));
    }

    @Test void aChangedDatasetInvalidatesItsReview() {
        assertThatIllegalArgumentException().isThrownBy(() -> new ZoneNeighborhood("new", "old", ZONES, Map.of()));
        assertThatIllegalArgumentException().isThrownBy(() -> new ZoneNeighborhood("", "", ZONES, Map.of()));
    }

    @Test void unavailableZonesAndInvalidIdentifiersAreRejected() {
        assertThatIllegalArgumentException().isThrownBy(() -> new ZoneNeighborhood("a", "a", ZONES, Map.of(10L, Set.of(99L))));
        assertThatIllegalArgumentException().isThrownBy(() -> new ZoneNeighborhood("a", "a", ZONES, Map.of(0L, Set.of(1L))));
        assertThatIllegalArgumentException().isThrownBy(() -> graph().eligible(-1L));
    }

    @Test void duplicateEmptyNullAndUnknownSelectionsAreRejected() {
        assertThatIllegalArgumentException().isThrownBy(() -> graph().requireAllowed(10L, List.of(1L, 1L)));
        assertThatIllegalArgumentException().isThrownBy(() -> graph().requireAllowed(10L, List.of()));
        assertThatIllegalArgumentException().isThrownBy(() -> graph().requireAllowed(10L, null));
        assertThatIllegalArgumentException().isThrownBy(() -> graph().requireAllowed(10L, List.of(99L)));
        assertThatIllegalArgumentException().isThrownBy(() -> graph().requireAllowed(10L, Arrays.asList(1L, null)));
    }

    @Test void inputAndOutputCollectionsCannotChangeAnExistingReview() {
        var associated = new HashSet<Long>(Set.of(1L));
        var graph = new ZoneNeighborhood("a", "a", ZONES, Map.of(10L, associated));
        associated.add(4L);
        assertThat(graph.eligible(10L)).containsExactly(1L);
        assertThatExceptionOfType(UnsupportedOperationException.class).isThrownBy(() -> graph.eligible(10L).clear());
    }

    @Test void bibliotecaCentralAcceptsExactlyTheFiveConfirmedZones() throws Exception {
        // Local IDs exported read-only; zone codes preserve the business evidence.
        var properties = new Properties();
        try (var stream = getClass().getResourceAsStream("/neighborhood/biblioteca-central.properties")) {
            assertThat(stream).isNotNull();
            properties.load(new InputStreamReader(stream, StandardCharsets.UTF_8));
        }
        Set<String> codes = Set.of("AV-0174", "AV-0380", "AV-0377", "AV-0378", "AV-0381");
        var confirmed = new HashSet<Long>();
        codes.forEach(code -> confirmed.add(Long.valueOf(properties.getProperty(code))));
        assertThat(confirmed).hasSize(5);
        assertThat(properties.getProperty("placeCode")).isEqualTo("LUG-0001");
        var universe = new HashSet<Long>();
        for (String value : properties.getProperty("availableZoneIds").split(",")) universe.add(Long.valueOf(value));
        long placeId = Long.parseLong(properties.getProperty("placeId"));
        String revision = properties.getProperty("datasetRevision");
        var graph = new ZoneNeighborhood(revision, revision, universe, Map.of(placeId, confirmed));
        assertThat(graph.eligible(placeId)).containsExactlyInAnyOrderElementsOf(confirmed);
        graph.requireAllowed(placeId, confirmed);
        confirmed.forEach(id -> graph.requireAllowed(placeId, List.of(id)));
        var outside = new HashSet<>(universe);
        outside.removeAll(confirmed);
        assertThat(outside).hasSize(526);
        for (long id : outside) {
            assertThatIllegalArgumentException().isThrownBy(() -> graph.requireAllowed(placeId, List.of(id)));
        }
    }
}
