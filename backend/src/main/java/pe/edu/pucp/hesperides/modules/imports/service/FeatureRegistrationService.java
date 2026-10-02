package pe.edu.pucp.hesperides.modules.imports.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.imports.csv.CsvRow;
import pe.edu.pucp.hesperides.modules.imports.csv.Issue;
import pe.edu.pucp.hesperides.modules.imports.csv.RowReader;
import pe.edu.pucp.hesperides.modules.imports.dto.FeatureForm;
import pe.edu.pucp.hesperides.modules.imports.dto.UploadedPhoto;
import pe.edu.pucp.hesperides.modules.imports.features.FeatureCsvSchema;
import pe.edu.pucp.hesperides.modules.imports.features.FeatureDraft;
import pe.edu.pucp.hesperides.modules.imports.features.FeatureKind;
import pe.edu.pucp.hesperides.modules.imports.features.FeaturePreview;
import pe.edu.pucp.hesperides.modules.imports.features.FeaturePreview.PlannedFeature;
import pe.edu.pucp.hesperides.modules.imports.features.FeatureResolver;
import pe.edu.pucp.hesperides.modules.imports.features.FeatureWriter;
import pe.edu.pucp.hesperides.modules.imports.repository.FeatureLookupRepository;
import pe.edu.pucp.hesperides.modules.imports.repository.SpecimenLookupRepository;
import pe.edu.pucp.hesperides.shared.exception.PossibleDuplicateException;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;
import pe.edu.pucp.hesperides.shared.storage.PhotoStore;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * Registro de un tacho o bebedero por formulario. El formulario se lee como
 * una fila del estándar: mismas listas válidas, mismo chequeo de campus y de
 * duplicados que la carga por CSV.
 */
@Service
@RequiredArgsConstructor
public class FeatureRegistrationService {

    private final FeatureLookupRepository lookup;
    private final SpecimenLookupRepository users;
    private final FeatureResolver resolver;
    private final FeatureWriter writer;
    private final PhotoStore photos;

    /** @return el código asignado (TA-000001, BB-000001) */
    @Transactional
    public String register(FeatureForm form, UploadedPhoto photo, boolean confirmDuplicate, String userEmail) {
        FeatureKind kind = FeatureKind.of(form.kind())
                .orElseThrow(() -> new ValidationException("Unknown component type: " + form.kind()));
        List<Issue> issues = new ArrayList<>();
        FeatureDraft draft = FeatureCsvSchema.read(new RowReader(new CsvRow(0, form.cells()), issues), kind, lookup.vocabulary());
        PlannedFeature row = draft == null ? null
                : firstOrIssues(resolver.resolve(kind, new FeatureCsvSchema.Parsed(List.of(draft), List.of(), false), Set.of()), issues);
        if (row == null) {
            Issue i = issues.get(0);
            throw new ValidationException(i.message() + " (" + i.column() + ")");
        }
        if (row.isPossibleDuplicate() && !confirmDuplicate) {
            throw new PossibleDuplicateException(row.duplicateOf(), row.duplicateDistanceM());
        }
        FeatureWriter.Written w = writer.write(kind, row, null);
        if (photo != null) {
            // Una imagen que no se puede leer cancela todo el registro.
            writer.attachPhoto(w.id(), photos.save("campus-features/" + w.code(), photo.content()), photo.fileName(), null,
                    users.userId(userEmail));
        }
        return w.code();
    }

    private static PlannedFeature firstOrIssues(FeaturePreview preview, List<Issue> issues) {
        issues.addAll(preview.issues());
        return preview.rows().isEmpty() ? null : preview.rows().get(0);
    }
}
