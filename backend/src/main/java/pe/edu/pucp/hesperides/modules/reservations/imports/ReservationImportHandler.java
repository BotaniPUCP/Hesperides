package pe.edu.pucp.hesperides.modules.reservations.imports;

import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import pe.edu.pucp.hesperides.modules.imports.service.ImportBatchGate;
import pe.edu.pucp.hesperides.modules.imports.service.ImportBatchGate.Claimed;
import pe.edu.pucp.hesperides.modules.imports.service.ImportBatchGate.Opened;
import pe.edu.pucp.hesperides.modules.imports.service.ImportHandler;
import pe.edu.pucp.hesperides.modules.imports.service.ImportUpload;
import pe.edu.pucp.hesperides.modules.reservations.imports.ReservationImportDtos.PlannedRow;
import pe.edu.pucp.hesperides.modules.reservations.imports.ReservationImportDtos.ReservationPreview;
import pe.edu.pucp.hesperides.modules.reservations.imports.ReservationImportDtos.ReservationReport;
import pe.edu.pucp.hesperides.modules.reservations.imports.ReservationImportDtos.ReservationResult;
import pe.edu.pucp.hesperides.modules.reservations.imports.ReservationImportDtos.RowAction;
import pe.edu.pucp.hesperides.modules.reservations.imports.ReservationImportDtos.StagedRow;
import pe.edu.pucp.hesperides.modules.reservations.service.ReservationsService;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import tools.jackson.core.type.TypeReference;

/**
 * Registro masivo de reservas en el ciclo común (SPEC-107 §5.4): la vista previa
 * se guarda en el lote y la confirmación escribe exactamente eso, todo o nada.
 * Los cruces y el trabajo cercano se muestran como avisos, nunca como errores.
 */
@Service
@RequiredArgsConstructor
public class ReservationImportHandler implements ImportHandler {

    private final ReservationImportPlanner planner;
    private final ReservationsService reservations;
    private final ImportBatchGate gate;
    private final TransactionTemplate transaction;

    @Override
    public Set<String> kinds() {
        return Set.of(ReservationImportPlanner.KIND);
    }

    @Override
    public ReservationPreview preview(String kind, ImportUpload upload, String userEmail) {
        List<StagedRow> staged = planner.plan(
                ReservationCsv.read(upload.csv(), ReservationImportPlanner.COLUMNS).rows());
        Opened opened = gate.open(ReservationImportPlanner.KIND, upload.fileName(), userEmail,
                new ReservationReport(staged));
        List<PlannedRow> rows = staged.stream().map(StagedRow::row).toList();
        int errors = count(rows, RowAction.ERROR);
        return new ReservationPreview(opened.batchId(), ReservationImportPlanner.KIND, rows.size(),
                count(rows, RowAction.CREATE), count(rows, RowAction.WARNING), errors, rows, errors == 0,
                opened.expiresAt());
    }

    @Override
    public ReservationResult confirm(Claimed claimed, Map<Integer, Boolean> decisions) {
        long batchId = claimed.batch().id();
        List<StagedRow> staged = gate.report(claimed.batch(), new TypeReference<ReservationReport>() {
        }).rows();
        if (staged.stream().anyMatch(s -> s.row().action() == RowAction.ERROR)) {
            throw new BusinessRuleException("The file has rows with errors: fix them and upload it again");
        }
        return transaction.execute(status -> {
            List<String> created = staged.stream()
                    .map(s -> reservations.createForImport(s.request(), claimed.userId(), batchId))
                    .toList();
            ReservationResult result = new ReservationResult(batchId, created.size(), created);
            gate.close(batchId, result);
            return result;
        });
    }

    private static int count(List<PlannedRow> rows, RowAction action) {
        return (int) rows.stream().filter(r -> r.action() == action).count();
    }
}
