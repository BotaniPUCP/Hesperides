package pe.edu.pucp.hesperides.modules.directory.imports;

import java.util.List;
import java.util.function.Consumer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.directory.imports.ImportDtos.ImportOutcome;
import pe.edu.pucp.hesperides.modules.directory.imports.ImportDtos.ImportPlan;
import pe.edu.pucp.hesperides.modules.directory.imports.ImportDtos.RowAction;
import pe.edu.pucp.hesperides.modules.directory.service.ContactService;
import pe.edu.pucp.hesperides.modules.directory.service.OrganizationService;
import pe.edu.pucp.hesperides.modules.imports.csv.CsvTable;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

/**
 * Registro masivo del Directorio en dos pasos: la vista previa no escribe nada y
 * la confirmación vuelve a leer el mismo archivo. Es todo o nada: con una fila con
 * error no se guarda ninguna, para no dejar un archivo cargado a medias.
 */
@Service
@RequiredArgsConstructor
public class DirectoryImportService {

    public static final String ORGANIZATIONS = "organizaciones";
    public static final String CONTACTS = "contactos";
    /** Más filas no caben en una vista previa legible; un archivo así se parte en varios. */
    static final int MAX_ROWS = 2000;

    private final OrganizationImportPlanner organizationPlanner;
    private final ContactImportPlanner contactPlanner;
    private final OrganizationService organizations;
    private final ContactService contacts;

    @Transactional(readOnly = true)
    public ImportPlan preview(String kind, byte[] csv) {
        CsvTable table = table(kind, csv);
        List<? extends Planned<?>> planned = ORGANIZATIONS.equals(kind)
                ? organizationPlanner.plan(table.rows()) : contactPlanner.plan(table.rows());
        return ImportPlan.of(kind, planned.stream().map(Planned::toRow).toList());
    }

    @Transactional
    public ImportOutcome confirm(String kind, byte[] csv) {
        CsvTable table = table(kind, csv);
        return ORGANIZATIONS.equals(kind)
                ? apply(organizationPlanner.plan(table.rows()), organizations::create)
                : apply(contactPlanner.plan(table.rows()), contacts::create);
    }

    /** Crea con las mismas reglas que el registro individual: los servicios auditan cada alta. */
    private static <T> ImportOutcome apply(List<Planned<T>> planned, Consumer<T> create) {
        if (planned.stream().anyMatch(p -> p.action() == RowAction.ERROR)) {
            throw new BusinessRuleException("The file has rows with errors: fix them and upload it again");
        }
        List<Planned<T>> toCreate = planned.stream().filter(p -> p.action() == RowAction.CREATE).toList();
        toCreate.forEach(p -> create.accept(p.request()));
        return new ImportOutcome(toCreate.size(), planned.size() - toCreate.size());
    }

    private static CsvTable table(String kind, byte[] csv) {
        List<String> columns = columns(kind);
        CsvTable table = CsvTable.parse(csv);
        List<String> missing = columns.stream().filter(c -> !table.header().contains(c)).toList();
        if (!missing.isEmpty()) {
            throw new ValidationException("The file is missing the columns: " + String.join(", ", missing));
        }
        if (table.rows().size() > MAX_ROWS) {
            throw new ValidationException("The file has more than " + MAX_ROWS + " rows: split it into smaller files");
        }
        return table;
    }

    static List<String> columns(String kind) {
        return switch (kind) {
            case ORGANIZATIONS -> OrganizationImportPlanner.COLUMNS;
            case CONTACTS -> ContactImportPlanner.COLUMNS;
            default -> throw new ResourceNotFoundException("Unknown directory import: " + kind);
        };
    }
}
