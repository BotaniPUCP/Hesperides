package pe.edu.pucp.hesperides.modules.irrigation.service;

import org.junit.jupiter.api.Test;
import pe.edu.pucp.hesperides.modules.irrigation.dto.CreateIrrigationTurnRequest;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;
import java.time.LocalDate;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class IrrigationBatchRulesTest {
    private CreateIrrigationTurnRequest turn(long sector, long section) {
        return new CreateIrrigationTurnRequest(sector, LocalDate.of(2026,10,21),
            null, null, List.of(section), "prueba");
    }
    @Test void permitsDifferentSectors() {
        assertDoesNotThrow(() -> IrrigationBatchRules.check(List.of(turn(1, 10), turn(2, 20))));
    }
    @Test void rejectsSameSectorTwice() {
        assertThrows(ValidationException.class,
            () -> IrrigationBatchRules.check(List.of(turn(1, 10), turn(1, 20))));
    }
    @Test void rejectsEmptyBatch() {
        assertThrows(ValidationException.class, () -> IrrigationBatchRules.check(List.of()));
    }
    @Test void rejectsNullDate() {
        assertThrows(ValidationException.class, () -> IrrigationBatchRules.check(List.of(
            new CreateIrrigationTurnRequest(1L, null, null, null, List.of(10L), null))));
    }
}
