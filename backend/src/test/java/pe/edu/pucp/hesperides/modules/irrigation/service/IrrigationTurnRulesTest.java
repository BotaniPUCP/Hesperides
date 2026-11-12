package pe.edu.pucp.hesperides.modules.irrigation.service;

import org.junit.jupiter.api.Test;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;
import java.time.LocalTime;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class IrrigationTurnRulesTest {
    @Test void acceptsValidSectionsAndTimes() {
        assertDoesNotThrow(() -> IrrigationTurnRules.check(
            LocalTime.of(7, 0), LocalTime.of(11, 0), List.of(1L, 2L)));
    }
    @Test void refusesDuplicateSections() {
        assertThrows(ValidationException.class,
            () -> IrrigationTurnRules.check(null, null, List.of(1L, 1L)));
    }
    @Test void refusesReversedTimes() {
        assertThrows(ValidationException.class,
            () -> IrrigationTurnRules.check(LocalTime.of(11, 0), LocalTime.of(7, 0), List.of(1L)));
    }
    @Test void refusesEmptySections() {
        assertThrows(ValidationException.class,
            () -> IrrigationTurnRules.check(null, null, List.of()));
    }
}
