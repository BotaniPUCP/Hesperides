package pe.edu.pucp.hesperides.engine.places;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class PlaceHierarchyTest {

    @Test
    void aPlaceWithoutParentIsAlwaysValid() {
        assertThat(PlaceHierarchy.check(7L, List.of(), 3)).isEmpty();
    }

    @Test
    void threeLevelsAreAllowed() {
        // Cancha 1 (subárbol de 1) bajo Polideportivo, que está bajo Zona deportiva.
        assertThat(PlaceHierarchy.check(9L, List.of(5L, 1L), 1)).isEmpty();
    }

    @Test
    void aFourthLevelIsRejected() {
        assertThat(PlaceHierarchy.check(9L, List.of(5L, 1L), 2)).contains(HierarchyViolation.TOO_DEEP);
        assertThat(PlaceHierarchy.check(9L, List.of(6L, 5L, 1L), 1)).contains(HierarchyViolation.TOO_DEEP);
    }

    @Test
    void aPlaceCannotBeItsOwnParent() {
        assertThat(PlaceHierarchy.check(5L, List.of(5L), 1)).contains(HierarchyViolation.CYCLE);
    }

    @Test
    void aPlaceCannotHangFromOneOfItsDescendants() {
        assertThat(PlaceHierarchy.check(1L, List.of(5L, 1L), 1)).contains(HierarchyViolation.CYCLE);
    }

    @Test
    void aNewPlaceHasNoIdAndCannotFormACycle() {
        assertThat(PlaceHierarchy.check(null, List.of(5L, 1L), 1)).isEmpty();
    }
}
