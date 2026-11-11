package pe.edu.pucp.hesperides.modules.reservations.imports;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.engine.reservations.ReservationPeriod;
import pe.edu.pucp.hesperides.modules.directory.dto.DirectoryResponses.OrganizationSuggestion;
import pe.edu.pucp.hesperides.modules.directory.repository.DirectoryLookupRepository;
import pe.edu.pucp.hesperides.modules.imports.csv.CsvRow;
import pe.edu.pucp.hesperides.modules.reservations.dto.ReservationDtos.ReservationRequest;
import pe.edu.pucp.hesperides.modules.reservations.dto.ReservationDtos.Warning;
import pe.edu.pucp.hesperides.modules.reservations.imports.ReservationImportDtos.IssueCode;
import pe.edu.pucp.hesperides.modules.reservations.imports.ReservationImportDtos.PlannedRow;
import pe.edu.pucp.hesperides.modules.reservations.imports.ReservationImportDtos.RowAction;
import pe.edu.pucp.hesperides.modules.reservations.imports.ReservationImportDtos.RowIssue;
import pe.edu.pucp.hesperides.modules.reservations.imports.ReservationImportDtos.StagedRow;
import pe.edu.pucp.hesperides.modules.reservations.repository.ReservationReadRepository;
import pe.edu.pucp.hesperides.modules.reservations.repository.ReservationReadRepository.ContactRow;
import pe.edu.pucp.hesperides.modules.reservations.repository.ReservationReadRepository.OrganizationRow;
import pe.edu.pucp.hesperides.modules.reservations.repository.ReservationReadRepository.PlaceRow;
import pe.edu.pucp.hesperides.modules.reservations.service.ReservationsService;

/**
 * Revisa una fila del estándar de reservas (SPEC-107 §5.4) con las mismas reglas
 * que el formulario. El jardín se resuelve por nombre, alias o código de una de
 * sus secciones; la organización y el contacto, por código o nombre.
 */
@Component
@RequiredArgsConstructor
public class ReservationImportPlanner {

    static final List<String> COLUMNS = List.of("jardin", "organizacion", "contacto", "inicio", "fin", "motivo");
    static final String KIND = "reservations";

    private static final int MAX_PURPOSE = 300;
    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("dd/MM/uuuu HH:mm")
            .withResolverStyle(ResolverStyle.STRICT);

    private final ReservationReadRepository reads;
    private final DirectoryLookupRepository directory;
    private final ReservationsService reservations;

    @Value("${hesperides.maintenance.time-zone:America/Lima}")
    private String timeZone;

    public List<StagedRow> plan(List<CsvRow> rows) {
        List<StagedRow> planned = new ArrayList<>();
        for (CsvRow row : rows) {
            planned.add(planRow(row));
        }
        return planned;
    }

    private StagedRow planRow(CsvRow row) {
        List<RowIssue> issues = new ArrayList<>();
        String gardenText = text(row, "jardin");
        String organizationText = text(row, "organizacion");
        String contactText = text(row, "contacto");
        String purpose = text(row, "motivo");
        OffsetDateTime startsAt = date(row, issues, "inicio");
        OffsetDateTime endsAt = date(row, issues, "fin");

        PlaceRow garden = null;
        if (gardenText == null) {
            issues.add(new RowIssue(row.line(), "jardin", IssueCode.REQUIRED, null));
        } else {
            garden = reads.gardenMatching(gardenText, true);
            if (garden == null) {
                PlaceRow other = reads.gardenMatching(gardenText, false);
                issues.add(other == null
                        ? new RowIssue(row.line(), "jardin", IssueCode.UNKNOWN_GARDEN, gardenText)
                        : new RowIssue(row.line(), "jardin", IssueCode.GARDEN_NOT_RESERVABLE, other.name()));
            }
        }

        OrganizationRow organization = null;
        if (organizationText == null) {
            issues.add(new RowIssue(row.line(), "organizacion", IssueCode.REQUIRED, null));
        } else {
            OrganizationSuggestion found = directory.organizationMatching(organizationText).orElse(null);
            if (found == null) {
                issues.add(new RowIssue(row.line(), "organizacion", IssueCode.UNKNOWN_ORGANIZATION, organizationText));
            } else {
                organization = reads.organization(found.code());
            }
        }

        ContactRow contact = null;
        if (contactText != null) {
            if (organization == null) {
                // Sin organización no hay a qué vincular el contacto; el error de la organización ya está.
                contact = null;
            } else {
                contact = reads.contactMatching(contactText, organization.id());
                if (contact == null) {
                    issues.add(new RowIssue(row.line(), "contacto", IssueCode.UNKNOWN_CONTACT, contactText));
                }
            }
        }

        if (startsAt != null && endsAt != null) {
            if (!endsAt.isAfter(startsAt)) {
                issues.add(new RowIssue(row.line(), "fin", IssueCode.END_BEFORE_START, null));
            } else if (!ReservationPeriod.withinMaximumDuration(startsAt.toInstant(), endsAt.toInstant())) {
                issues.add(new RowIssue(row.line(), "fin", IssueCode.MAX_DURATION, null));
            }
        }

        if (purpose != null && purpose.length() > MAX_PURPOSE) {
            issues.add(new RowIssue(row.line(), "motivo", IssueCode.TOO_LONG, null));
        }

        List<Warning> warnings = List.of();
        RowAction action = RowAction.ERROR;
        ReservationRequest request = null;
        if (issues.isEmpty()) {
            request = new ReservationRequest(garden.id(), organization.code(),
                    contact == null ? null : contact.code(), startsAt, endsAt, purpose, null);
            warnings = reservations.check(garden.id(), startsAt, endsAt, null);
            action = warnings.isEmpty() ? RowAction.CREATE : RowAction.WARNING;
        }

        String gardenName = garden == null ? gardenText : garden.name();
        String organizationName = organization == null ? organizationText : organization.name();
        PlannedRow planned = new PlannedRow(row.line(), gardenName, organizationName, action, List.copyOf(issues),
                warnings);
        return new StagedRow(planned, action == RowAction.ERROR ? null : request);
    }

    private OffsetDateTime date(CsvRow row, List<RowIssue> issues, String column) {
        String raw = text(row, column);
        if (raw == null) {
            issues.add(new RowIssue(row.line(), column, IssueCode.REQUIRED, null));
            return null;
        }
        try {
            LocalDateTime local = LocalDateTime.parse(raw, DATE_TIME);
            return local.atZone(ZoneId.of(timeZone)).toOffsetDateTime();
        } catch (DateTimeParseException ex) {
            issues.add(new RowIssue(row.line(), column, IssueCode.DATE_FORMAT, raw));
            return null;
        }
    }

    private static String text(CsvRow row, String column) {
        String value = row.get(column);
        return value == null || value.isBlank() ? null : value.strip();
    }
}
