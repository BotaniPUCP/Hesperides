package pe.edu.pucp.hesperides.modules.imports.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pe.edu.pucp.hesperides.modules.imports.csv.CsvTable;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportPreviewResponse;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportResultResponse;
import pe.edu.pucp.hesperides.modules.imports.service.ImportBatchGate.Claimed;
import pe.edu.pucp.hesperides.modules.imports.service.ImportBatchGate.Opened;
import pe.edu.pucp.hesperides.modules.imports.specimens.PhotoFiles;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenCsvSchema;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenPreview;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenPreview.PlannedRow;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenResolver;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Carga de ejemplares por CSV en dos pasos (SPEC-103 D-04): la vista previa no
 * escribe nada y se guarda; la confirmación escribe exactamente lo previsto.
 */
@Service
@RequiredArgsConstructor
public class SpecimenImportService implements ImportHandler {

    static final String KIND = "specimens";

    private final SpecimenResolver resolver;
    private final ImportBatchGate gate;
    private final SpecimenImportWriter writer;

    @Override
    public Set<String> kinds() {
        return Set.of(KIND);
    }

    @Override
    public ImportPreviewResponse preview(String kind, byte[] csv, String fileName, byte[] zip, String userEmail) {
        Map<String, byte[]> photos = zip == null ? Map.of() : PhotoFiles.read(zip);
        SpecimenPreview preview = resolver.resolve(SpecimenCsvSchema.parse(CsvTable.parse(csv)), Set.copyOf(photos.keySet()));
        Opened opened = gate.open(KIND, fileName, userEmail, preview, zip);
        return PreviewMapper.toResponse(opened.batchId(), KIND, preview, opened.expiresAt());
    }

    @Override
    public ImportResultResponse confirm(Claimed claimed, Map<Integer, Boolean> decisions) {
        long batchId = claimed.batch().id();
        SpecimenPreview preview = gate.report(claimed.batch(), SpecimenPreview.class);
        if (!preview.canConfirm()) {
            throw new BusinessRuleException("The file has errors: fix them and upload it again");
        }
        List<PlannedRow> included = ImportBatchGate.include(preview.rows(), decisions);
        return writer.write(batchId, preview, included, claimed.userId());
    }
}
