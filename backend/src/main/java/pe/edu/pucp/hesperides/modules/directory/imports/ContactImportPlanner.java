package pe.edu.pucp.hesperides.modules.directory.imports;

import static pe.edu.pucp.hesperides.modules.directory.imports.OrganizationImportPlanner.blankToNull;
import static pe.edu.pucp.hesperides.modules.directory.imports.OrganizationImportPlanner.splitList;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.engine.directory.ContactEmail;
import pe.edu.pucp.hesperides.engine.directory.ContactPhones;
import pe.edu.pucp.hesperides.engine.directory.DirectoryKey;
import pe.edu.pucp.hesperides.modules.directory.dto.ContactRequest;
import pe.edu.pucp.hesperides.modules.directory.dto.DirectoryResponses.OrganizationSuggestion;
import pe.edu.pucp.hesperides.modules.directory.imports.ImportDtos.DirectoryReport;
import pe.edu.pucp.hesperides.modules.directory.repository.DirectoryLookupRepository;
import pe.edu.pucp.hesperides.modules.directory.repository.ImportTrailRepository;
import pe.edu.pucp.hesperides.modules.directory.service.ContactService;
import pe.edu.pucp.hesperides.modules.imports.csv.CsvRow;
import tools.jackson.core.type.TypeReference;

/**
 * El estándar de contactos: decide qué pasa con cada fila y crea los nuevos. Las
 * organizaciones tienen que existir antes: se cargan primero.
 */
@Component
@RequiredArgsConstructor
class ContactImportPlanner implements DirectoryStandard<ContactRequest> {

    static final String KIND = "contacts";

    static final List<String> COLUMNS = List.of("nombre", "organizaciones", "anexo", "celular", "correo");

    private final DirectoryLookupRepository lookup;
    private final ContactService service;
    private final ImportTrailRepository trail;

    @Override
    public String kind() {
        return KIND;
    }

    @Override
    public List<String> columns() {
        return COLUMNS;
    }

    @Override
    public String create(ContactRequest request, long batchId) {
        String code = service.create(request);
        trail.markContact(code, batchId);
        return code;
    }

    @Override
    public TypeReference<DirectoryReport<ContactRequest>> reportType() {
        return new TypeReference<>() {
        };
    }

    @Override
    public List<Planned<ContactRequest>> plan(List<CsvRow> rows) {
        Set<String> seen = new HashSet<>();
        List<Planned<ContactRequest>> planned = new ArrayList<>();
        for (CsvRow row : rows) {
            planned.add(planRow(row, seen));
        }
        return planned;
    }

    private Planned<ContactRequest> planRow(CsvRow row, Set<String> seen) {
        String name = blankToNull(row.get("nombre"));
        Planned<ContactRequest> p = new Planned<>(row.line(), name);
        if (name == null) {
            p.fail("nombre", IssueCode.REQUIRED, null);
        } else if (name.length() > OrganizationImportPlanner.MAX_NAME) {
            p.fail("nombre", IssueCode.TOO_LONG, null);
        }
        List<String> organizationCodes = organizations(row, p);
        String extension = phone(row, p, "anexo", true);
        String mobile = phone(row, p, "celular", false);
        String email = blankToNull(row.get("correo"));
        if (email != null && !ContactEmail.isValid(email)) {
            p.fail("correo", IssueCode.EMAIL_FORMAT, null);
        }
        if (p.ok()) {
            checkExisting(p, name, organizationCodes.getFirst(), seen);
        }
        p.request(new ContactRequest(name, organizationCodes, extension, mobile, email));
        return p;
    }

    /**
     * Una organización que no está en el Directorio omite la fila entera, sin
     * bloquear el archivo: un contacto con solo parte de sus organizaciones
     * quedaría registrado a medias sin que nadie lo note.
     */
    private List<String> organizations(CsvRow row, Planned<?> p) {
        List<String> texts = splitList(row.get("organizaciones"));
        if (texts.isEmpty()) {
            p.fail("organizaciones", IssueCode.REQUIRED, null);
        }
        List<String> codes = new ArrayList<>();
        for (String text : texts) {
            lookup.organizationMatching(text).map(OrganizationSuggestion::code).ifPresentOrElse(codes::add,
                    () -> p.missing(text));
        }
        return codes.stream().distinct().toList();
    }

    /** Los teléfonos no se repiten en el detalle del error: son datos personales. */
    private static String phone(CsvRow row, Planned<?> p, String column, boolean isExtension) {
        String phone = ContactPhones.normalize(row.get(column));
        if (phone == null) {
            return null;
        }
        boolean valid = isExtension ? ContactPhones.isValidExtension(phone) : ContactPhones.isValidMobile(phone);
        if (!valid) {
            p.fail(column, isExtension ? IssueCode.EXTENSION_FORMAT : IssueCode.MOBILE_FORMAT, null);
        }
        return phone;
    }

    /** La misma persona en la misma organización: ya existe, o se repite en el archivo. */
    private void checkExisting(Planned<?> p, String name, String firstOrganization, Set<String> seen) {
        if (!seen.add(DirectoryKey.of(name) + "|" + firstOrganization)) {
            p.fail("nombre", IssueCode.DUPLICATED_IN_FILE, null);
        } else if (lookup.contactNamedIn(name, firstOrganization)) {
            p.markExisting();
        }
    }
}
