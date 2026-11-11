package pe.edu.pucp.hesperides.modules.reservations.imports;

import java.time.LocalDateTime;
import java.util.List;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportOutcome;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportPreview;
import pe.edu.pucp.hesperides.modules.reservations.dto.ReservationDtos.ReservationRequest;
import pe.edu.pucp.hesperides.modules.reservations.dto.ReservationDtos.Warning;

/** Lo que guarda y devuelve el registro masivo de reservas (SPEC-107 §5.4). */
public final class ReservationImportDtos {

    private ReservationImportDtos() {
    }

    /**
     * CREATE se crea; WARNING se crea igual, pero con cruces o trabajo cercano
     * (los avisos nunca bloquean, D-04 y D-07); ERROR impide confirmar.
     */
    public enum RowAction {
        CREATE, WARNING, ERROR
    }

    /** Motivos estables para que el frontend los traduzca; {@code detail} trae el dato. */
    public enum IssueCode {
        REQUIRED,
        UNKNOWN_GARDEN,
        GARDEN_NOT_RESERVABLE,
        UNKNOWN_ORGANIZATION,
        UNKNOWN_CONTACT,
        DATE_FORMAT,
        END_BEFORE_START,
        MAX_DURATION,
        TOO_LONG
    }

    public record RowIssue(int line, String column, IssueCode code, String detail) {
    }

    /** Una fila revisada: lo que se crearía y, si los hay, los avisos que no la bloquean. */
    public record PlannedRow(int line, String garden, String organization, RowAction action,
            List<RowIssue> issues, List<Warning> warnings) {
    }

    public record StagedRow(PlannedRow row, ReservationRequest request) {
    }

    /** El informe del lote: lo que vio la persona es exactamente lo que se escribe al confirmar. */
    public record ReservationReport(List<StagedRow> rows) {
    }

    public record ReservationPreview(long batchId, String kind, int totalRows, int toCreate, int toWarning,
                                     int errors, List<PlannedRow> rows, boolean canConfirm, LocalDateTime expiresAt)
            implements ImportPreview {
    }

    public record ReservationResult(long batchId, int created, List<String> createdCodes) implements ImportOutcome {
    }
}
