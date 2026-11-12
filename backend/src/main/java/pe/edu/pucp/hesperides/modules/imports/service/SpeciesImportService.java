package pe.edu.pucp.hesperides.modules.imports.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pe.edu.pucp.hesperides.modules.imports.csv.CsvTable;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportPreviewResponse;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportResultResponse;
import pe.edu.pucp.hesperides.modules.imports.repository.SpeciesImportRepository;
import pe.edu.pucp.hesperides.modules.imports.service.ImportBatchGate.Claimed;
import pe.edu.pucp.hesperides.modules.imports.service.ImportBatchGate.Opened;
import pe.edu.pucp.hesperides.modules.imports.species.SpeciesCsvSchema;
import pe.edu.pucp.hesperides.modules.imports.species.SpeciesPreview;
import pe.edu.pucp.hesperides.modules.imports.species.SpeciesPreview.PlannedRow;
import pe.edu.pucp.hesperides.modules.imports.species.SpeciesResolver;
import pe.edu.pucp.hesperides.modules.imports.specimens.PhotoFiles;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Carga masiva de especies botánicas por CSV en dos pasos: la vista previa
 * valida y cruza con el catálogo sin escribir; la confirmación inserta las
 * nuevas y actualiza las existentes.
 */
@Service
@RequiredArgsConstructor
public class SpeciesImportService implements ImportHandler {

    static final String KIND = "species";

    private final SpeciesImportRepository repository;
    private final SpeciesResolver resolver;
    private final ImportBatchGate gate;
    private final SpeciesImportWriter writer;

    @Override
    public Set<String> kinds() {
        return Set.of(KIND);
    }

    @Override
    public ImportPreviewResponse preview(String kind, byte[] csv, String fileName, byte[] zip, String userEmail) {
        Map<String, byte[]> photos = zip == null ? Map.of() : PhotoFiles.readStrict(zip);
        SpeciesCsvSchema.Parsed parsed = SpeciesCsvSchema.parse(CsvTable.parseStrict(csv), repository.vocabulary());
        SpeciesPreview preview = resolver.resolve(parsed, Set.copyOf(photos.keySet()));
        Opened opened = gate.open(KIND, fileName, userEmail, preview, zip);
        return PreviewMapper.toResponse(opened.batchId(), KIND, preview, opened.expiresAt());
    }

    @Override
    public ImportResultResponse confirm(Claimed claimed, Map<Integer, Boolean> decisions) {
        long batchId = claimed.batch().id();
        SpeciesPreview preview = gate.report(claimed.batch(), SpeciesPreview.class);
        if (!preview.canConfirm()) {
            throw new BusinessRuleException("The file has errors: fix them and upload it again");
        }
        List<PlannedRow> included = ImportBatchGate.include(preview.rows(), decisions);
        return writer.write(claimed, preview, included);
    }
}
