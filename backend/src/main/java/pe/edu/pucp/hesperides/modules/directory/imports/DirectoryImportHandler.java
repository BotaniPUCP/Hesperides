package pe.edu.pucp.hesperides.modules.directory.imports;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import pe.edu.pucp.hesperides.modules.directory.imports.ImportDtos.DirectoryPreview;
import pe.edu.pucp.hesperides.modules.directory.imports.ImportDtos.DirectoryReport;
import pe.edu.pucp.hesperides.modules.directory.imports.ImportDtos.DirectoryResult;
import pe.edu.pucp.hesperides.modules.directory.imports.ImportDtos.PlannedRow;
import pe.edu.pucp.hesperides.modules.directory.imports.ImportDtos.RowAction;
import pe.edu.pucp.hesperides.modules.directory.imports.ImportDtos.StagedRow;
import pe.edu.pucp.hesperides.modules.imports.service.ImportBatchGate;
import pe.edu.pucp.hesperides.modules.imports.service.ImportBatchGate.Claimed;
import pe.edu.pucp.hesperides.modules.imports.service.ImportBatchGate.Opened;
import pe.edu.pucp.hesperides.modules.imports.service.ImportHandler;
import pe.edu.pucp.hesperides.modules.imports.service.ImportUpload;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;

/**
 * Registro masivo del Directorio en el ciclo común (SPEC-106 §4.2): la vista
 * previa se guarda en el lote y la confirmación escribe exactamente eso. Es todo
 * o nada: con una fila con error no se guarda ninguna.
 */
@Service
public class DirectoryImportHandler implements ImportHandler {

    private final Map<String, DirectoryStandard<?>> byKind;
    private final ImportBatchGate gate;
    private final TransactionTemplate transaction;

    DirectoryImportHandler(List<DirectoryStandard<?>> standards, ImportBatchGate gate, TransactionTemplate transaction) {
        this.byKind = standards.stream().collect(Collectors.toMap(DirectoryStandard::kind, Function.identity()));
        this.gate = gate;
        this.transaction = transaction;
    }

    @Override
    public Set<String> kinds() {
        return byKind.keySet();
    }

    @Override
    public DirectoryPreview preview(String kind, ImportUpload upload, String userEmail) {
        return preview(standard(kind), upload, userEmail);
    }

    /** Las decisiones no aplican: un registro que ya existe se omite siempre, sin preguntar. */
    @Override
    public DirectoryResult confirm(Claimed claimed, Map<Integer, Boolean> decisions) {
        return confirm(standard(claimed.batch().kind()), claimed);
    }

    private <T> DirectoryPreview preview(DirectoryStandard<T> standard, ImportUpload upload, String userEmail) {
        List<StagedRow<T>> staged = standard.plan(DirectoryCsv.read(upload.csv(), standard.columns()).rows())
                .stream().map(Planned::toStaged).toList();
        Opened opened = gate.open(standard.kind(), upload.fileName(), userEmail, new DirectoryReport<>(staged));
        List<PlannedRow> rows = staged.stream().map(StagedRow::row).toList();
        int errors = DirectorySummary.count(rows, RowAction.ERROR);
        return new DirectoryPreview(opened.batchId(), standard.kind(), rows.size(),
                DirectorySummary.count(rows, RowAction.CREATE), DirectorySummary.count(rows, RowAction.SKIP),
                DirectorySummary.count(rows, RowAction.OMIT), errors, rows, DirectorySummary.missingOrganizations(rows),
                errors == 0, opened.expiresAt());
    }

    private <T> DirectoryResult confirm(DirectoryStandard<T> standard, Claimed claimed) {
        long batchId = claimed.batch().id();
        List<StagedRow<T>> staged = gate.report(claimed.batch(), standard.reportType()).rows();
        List<PlannedRow> rows = staged.stream().map(StagedRow::row).toList();
        if (DirectorySummary.count(rows, RowAction.ERROR) > 0) {
            throw new BusinessRuleException("The file has rows with errors: fix them and upload it again");
        }
        return transaction.execute(status -> {
            List<String> created = staged.stream().filter(s -> s.row().action() == RowAction.CREATE)
                    .map(s -> standard.create(s.request(), batchId)).toList();
            DirectoryResult result = new DirectoryResult(batchId, created.size(),
                    DirectorySummary.count(rows, RowAction.SKIP), DirectorySummary.count(rows, RowAction.OMIT),
                    DirectorySummary.missingOrganizations(rows), created);
            gate.close(batchId, result);
            return result;
        });
    }

    private DirectoryStandard<?> standard(String kind) {
        DirectoryStandard<?> standard = byKind.get(kind);
        if (standard == null) {
            throw new ResourceNotFoundException("There is no CSV standard for: " + kind);
        }
        return standard;
    }
}
