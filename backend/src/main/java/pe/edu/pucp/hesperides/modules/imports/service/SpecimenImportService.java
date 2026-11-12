package pe.edu.pucp.hesperides.modules.imports.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pe.edu.pucp.hesperides.modules.imports.csv.CsvTable;
import pe.edu.pucp.hesperides.modules.imports.ImportAction;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportPreviewResponse;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportConfirmationSummary;
import pe.edu.pucp.hesperides.modules.imports.dto.ImportResultResponse;
import pe.edu.pucp.hesperides.modules.imports.dto.SpeciesImportOption;
import pe.edu.pucp.hesperides.modules.imports.repository.SpecimenLookupRepository;
import pe.edu.pucp.hesperides.modules.imports.service.ImportBatchGate.Claimed;
import pe.edu.pucp.hesperides.modules.imports.service.ImportBatchGate.Opened;
import pe.edu.pucp.hesperides.modules.imports.specimens.PhotoFiles;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenCsvSchema;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenPreview;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenPreview.PlannedRow;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenBindingKeyCompatibility;
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
    private final SpecimenLookupRepository lookup;

    public List<SpeciesImportOption> speciesOptions(String search) {
        return lookup.speciesImportOptions(search, 20);
    }

    @Override
    public Set<String> kinds() {
        return Set.of(KIND);
    }

    @Override
    public ImportPreviewResponse preview(String kind, byte[] csv, String fileName, byte[] zip, String userEmail) {
        return previewWithBindings(kind, csv, fileName, zip, Map.of(), userEmail);
    }

    @Override
    public ImportPreviewResponse previewWithBindings(String kind, byte[] csv, String fileName, byte[] zip,
                                                      Map<String, String> speciesBindings, String userEmail) {
        Map<String, byte[]> photos = zip == null ? Map.of() : PhotoFiles.readStrict(zip);
        SpecimenPreview preview = resolver.resolve(SpecimenCsvSchema.parse(CsvTable.parseStrict(csv)),
                Set.copyOf(photos.keySet()), speciesBindings);
        Opened opened = gate.open(KIND, fileName, userEmail, preview, zip);
        return PreviewMapper.toResponse(opened.batchId(), KIND, preview, opened.expiresAt(), opened.planFingerprint());
    }

    @Override
    public ImportPreviewResponse reanalyze(Claimed claimed, byte[] csv, String fileName, byte[] zip,
                                           Map<String, String> speciesBindings) {
        Map<String, byte[]> photos = zip == null ? Map.of() : PhotoFiles.readStrict(zip);
        SpecimenCsvSchema.Parsed parsed = SpecimenCsvSchema.parse(CsvTable.parseStrict(csv));
        SpecimenPreview previous = gate.report(claimed.batch(), SpecimenPreview.class);
        Map<String, String> recoveredBindings = SpecimenBindingKeyCompatibility.recover(
                previous, parsed.drafts(), speciesBindings);
        SpecimenPreview preview = resolver.resolve(parsed, Set.copyOf(photos.keySet()), recoveredBindings);
        Opened opened = gate.replacePreview(claimed, preview, zip);
        return PreviewMapper.toResponse(opened.batchId(), KIND, preview, opened.expiresAt(), opened.planFingerprint());
    }

    @Override
    public ImportResultResponse confirm(Claimed claimed, Map<Integer, Boolean> decisions) {
        long batchId = claimed.batch().id();
        SpecimenPreview preview = gate.report(claimed.batch(), SpecimenPreview.class);
        if (!preview.canConfirm()) {
            throw new BusinessRuleException("The file has errors: fix them and upload it again");
        }
        List<PlannedRow> included = ImportBatchGate.include(preview.rows(), decisions);
        return writer.write(claimed, preview, included);
    }

    @Override
    public ImportConfirmationSummary confirmationSummary(Claimed claimed, Map<Integer, Boolean> decisions) {
        SpecimenPreview preview = gate.report(claimed.batch(), SpecimenPreview.class);
        if (!preview.canConfirm()) {
            throw new BusinessRuleException("The file has errors: fix them and upload it again");
        }
        List<PlannedRow> included = ImportBatchGate.include(preview.rows(), decisions);

        // Reuse the same checks the writer performs before a confirmation. The summary is read-only.
        writer.verifyVersions(preview.rows(), false);
        resolver.verifyDuplicatePlanCurrent(preview.rows());

        return new ImportConfirmationSummary(claimed.batch().id(),
                (int) included.stream().filter(row -> row.action() == ImportAction.CREATE).count(),
                (int) included.stream().filter(row -> row.action() == ImportAction.UPDATE).count(),
                ImportBatchGate.confirmationFingerprint(claimed.batch(), decisions));
    }
}
