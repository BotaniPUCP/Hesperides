package pe.edu.pucp.hesperides.engine.pruning;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class PruningAssignmentTest {

    @ParameterizedTest
    @CsvSource({
            "false, true,  10.00, STABLE_STAFF",
            "false, false, ,      STABLE_STAFF",
            "true,  true,  4.99,  STABLE_STAFF",
            "true,  true,  5.00,  THIRD_PARTY",
            "true,  true,  12.50, THIRD_PARTY",
            "true,  false, ,      FIELD_VERIFICATION",
            "true,  true,  ,      FIELD_VERIFICATION",
    })
    void proposesWhoPrunes(boolean critical, boolean measured, BigDecimal heightM, String expected) {
        assertThat(PruningAssignment.propose(critical, measured, heightM)).isEqualTo(expected);
    }

    @Test
    void anUnmeasuredCriticalSpecimenIgnoresAnyHeightItWasGiven() {
        assertThat(PruningAssignment.propose(true, false, new BigDecimal("3.00"))).isEqualTo("FIELD_VERIFICATION");
    }

    @ParameterizedTest
    @CsvSource({
            "true,  true,  MEASURED",
            "true,  false, MEASURED",
            "false, false, REFERENCE",
            "false, true,  NOT_MEASURED",
    })
    void resolvesWhatTheSpecimenShows(boolean measured, boolean critical, String expected) {
        assertThat(PruningAssignment.measurementStatus(measured, critical)).isEqualTo(expected);
    }
}
