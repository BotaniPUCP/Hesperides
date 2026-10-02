package pe.edu.pucp.hesperides.modules.imports.service;

import pe.edu.pucp.hesperides.modules.imports.csv.Issue;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.imports.dto.AssessmentForm;
import pe.edu.pucp.hesperides.modules.imports.dto.AssessmentResponse;
import pe.edu.pucp.hesperides.modules.imports.dto.SpecimenForm;
import pe.edu.pucp.hesperides.modules.imports.repository.AssessmentRepository;
import pe.edu.pucp.hesperides.modules.imports.repository.SpecimenLookupRepository;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenCsvSchema;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenPreview;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenPreview.PlannedRow;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenResolver;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenWriter;
import pe.edu.pucp.hesperides.modules.inventory.repository.PhotoRepository;
import pe.edu.pucp.hesperides.modules.inventory.service.InventoryPhotoService;
import pe.edu.pucp.hesperides.shared.exception.PossibleDuplicateException;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import java.util.List;
import java.util.Set;

/**
 * Registro por formulario (SPEC-103 §5.1). Pasa por las mismas reglas que una
 * fila del CSV; la diferencia es que el duplicado se pregunta en el momento.
 */
@Service
@RequiredArgsConstructor
public class SpecimenRegistrationService {

    /** Una foto del formulario, ya leída del multipart. */
    public record Photo(byte[] content, String fileName) {
    }

    private final SpecimenResolver resolver;
    private final SpecimenWriter writer;
    private final SpecimenLookupRepository lookup;
    private final AssessmentRepository assessments;
    private final PhotoRepository elements;
    private final InventoryPhotoService photos;

    /** @return el código asignado */
    @Transactional
    public String register(SpecimenForm form, Photo photo, boolean confirmDuplicate, String userEmail) {
        PlannedRow row = resolve(form, null);
        if (row.isPossibleDuplicate() && !confirmDuplicate) {
            throw new PossibleDuplicateException(row.duplicateOf(), row.duplicateDistanceM());
        }
        return save(row, photo, userEmail);
    }

    /** Corrige un ejemplar: un campo vacío conserva lo registrado. */
    @Transactional
    public String update(String code, SpecimenForm form, Photo photo, String userEmail) {
        return save(resolve(form, code), photo, userEmail);
    }

    @Transactional
    public List<AssessmentResponse> assess(String code, AssessmentForm form, String userEmail) {
        long id = elements.elementId(code);
        writer.assess(id, form.toDraft(), lookup.userId(userEmail), null);
        return assessments.history(id);
    }

    public List<AssessmentResponse> history(String code) {
        return assessments.history(elements.elementId(code));
    }

    private String save(PlannedRow row, Photo photo, String userEmail) {
        long userId = lookup.userId(userEmail);
        SpecimenWriter.Written w = writer.write(row, null, userId, userId);
        if (photo != null) {
            // Una imagen que no se puede leer cancela todo el registro: falla antes de confirmar.
            photos.attachToSpecimen(w.code(), photo.content(), photo.fileName(), null, userEmail);
        }
        return w.code();
    }

    private PlannedRow resolve(SpecimenForm form, String code) {
        SpecimenPreview preview = resolver.resolve(
                new SpecimenCsvSchema.Parsed(List.of(form.toDraft(code)), List.of(), false), Set.of());
        if (!preview.unknownSpecies().isEmpty()) {
            throw new ValidationException("Unknown species: " + form.scientificName()
                    + ". Ask an administrator to add it to the catalog");
        }
        if (!preview.issues().isEmpty()) {
            Issue issue = preview.issues().get(0);
            throw new ValidationException(issue.message() + " (" + issue.column() + ")");
        }
        return preview.rows().get(0);
    }
}
