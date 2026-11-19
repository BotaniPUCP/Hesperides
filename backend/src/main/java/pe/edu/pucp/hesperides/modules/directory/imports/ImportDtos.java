package pe.edu.pucp.hesperides.modules.directory.imports;

import java.time.LocalDateTime;
import java.util.List;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportOutcome;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportPreview;

/** Lo que guarda y devuelve el registro masivo del Directorio. */
public final class ImportDtos {

    private ImportDtos() {
    }

    /**
     * CREATE se crea; SKIP ya existe y se omite; OMIT no entra porque falta su
     * organización (como una especie desconocida en el catastro); ERROR impide confirmar.
     */
    public enum RowAction {
        CREATE, SKIP, OMIT, ERROR
    }

    /**
     * Un problema de una fila. {@code code} es estable para que el frontend lo
     * traduzca; {@code detail} trae el dato que lo explica (una organización, un nombre).
     */
    public record RowIssue(int line, String column, IssueCode code, String detail) {
    }

    /** {@code missing}: las organizaciones de la fila que no están en el Directorio. */
    public record PlannedRow(int line, String name, RowAction action, List<RowIssue> issues, List<String> missing) {
    }

    /** Una organización que falta y cuántas filas dejó fuera. */
    public record MissingOrganization(String name, int rows) {
    }

    /** Una fila revisada tal como se guarda en el lote: con lo que se pedirá crear. */
    public record StagedRow<T>(PlannedRow row, T request) {
    }

    /** El informe del lote: lo que vio la persona es exactamente lo que se escribe al confirmar. */
    public record DirectoryReport<T>(List<StagedRow<T>> rows) {
    }

    public record DirectoryPreview(long batchId, String kind, int totalRows, int toCreate, int toSkip, int toOmit,
                                   int errors, List<PlannedRow> rows, List<MissingOrganization> missingOrganizations,
                                   boolean canConfirm, LocalDateTime expiresAt) implements ImportPreview {
    }

    public record DirectoryResult(long batchId, int created, int skipped, int omitted,
                                  List<MissingOrganization> missingOrganizations, List<String> createdCodes)
            implements ImportOutcome {
    }
}
