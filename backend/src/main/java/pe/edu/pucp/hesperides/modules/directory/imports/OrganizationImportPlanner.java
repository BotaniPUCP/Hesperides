package pe.edu.pucp.hesperides.modules.directory.imports;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.engine.directory.DirectoryKey;
import pe.edu.pucp.hesperides.engine.directory.RucRule;
import pe.edu.pucp.hesperides.modules.directory.dto.OrganizationRequest;
import pe.edu.pucp.hesperides.modules.directory.repository.DirectoryLookupRepository;
import pe.edu.pucp.hesperides.modules.directory.repository.OrganizationRepository;
import pe.edu.pucp.hesperides.modules.imports.csv.CsvRow;

/** Decide qué pasa con cada fila de un CSV de organizaciones, sin escribir nada. */
@Component
@RequiredArgsConstructor
class OrganizationImportPlanner {

    static final List<String> COLUMNS = List.of("nombre", "tipo", "ruc", "telefono", "otros_nombres");
    static final String LIST_SEPARATOR = "\\|";
    static final int MAX_NAME = 200;
    private static final int MAX_PHONE = 30;
    private static final String PUCP_UNIT = "PUCP_UNIT";
    /** Se acepta lo que escribe una persona y el código del sistema. */
    private static final Map<String, String> TYPES = Map.of("unidad pucp", PUCP_UNIT, "pucp_unit", PUCP_UNIT,
            "empresa externa", "EXTERNAL_COMPANY", "empresa", "EXTERNAL_COMPANY", "external_company", "EXTERNAL_COMPANY");

    private final DirectoryLookupRepository lookup;
    private final OrganizationRepository organizations;

    List<Planned<OrganizationRequest>> plan(List<CsvRow> rows) {
        Set<String> namesInFile = new HashSet<>();
        Set<String> rucsInFile = new HashSet<>();
        List<Planned<OrganizationRequest>> planned = new ArrayList<>();
        for (CsvRow row : rows) {
            planned.add(planRow(row, namesInFile, rucsInFile));
        }
        return planned;
    }

    private Planned<OrganizationRequest> planRow(CsvRow row, Set<String> namesInFile, Set<String> rucsInFile) {
        String name = blankToNull(row.get("nombre"));
        Planned<OrganizationRequest> p = new Planned<>(row.line(), name);
        String type = type(row, p);
        List<String> aliases = splitList(row.get("otros_nombres"));
        if (name == null) {
            p.fail("nombre", IssueCode.REQUIRED, null);
        } else if (name.length() > MAX_NAME) {
            p.fail("nombre", IssueCode.TOO_LONG, null);
        } else if (!namesInFile.add(DirectoryKey.of(name))) {
            p.fail("nombre", IssueCode.DUPLICATED_IN_FILE, name);
        } else if (lookup.organizationNamed(name)) {
            p.markExisting();
            return p;
        }
        checkNames(p, name, aliases, namesInFile);
        String ruc = ruc(row, p, type, rucsInFile);
        String phone = blankToNull(row.get("telefono"));
        if (phone != null && phone.length() > MAX_PHONE) {
            p.fail("telefono", IssueCode.TOO_LONG, null);
        }
        p.request(new OrganizationRequest(name, type, ruc, phone, aliases));
        return p;
    }

    private static String type(CsvRow row, Planned<?> p) {
        String text = blankToNull(row.get("tipo"));
        if (text == null) {
            p.fail("tipo", IssueCode.REQUIRED, null);
            return null;
        }
        String code = TYPES.get(DirectoryKey.of(text));
        if (code == null) {
            p.fail("tipo", IssueCode.UNKNOWN_TYPE, text);
        }
        return code;
    }

    /** Ni el nombre ni sus alias pueden ser el nombre o alias de otra organización. */
    private void checkNames(Planned<?> p, String name, List<String> aliases, Set<String> namesInFile) {
        for (String alias : aliases) {
            if (!namesInFile.add(DirectoryKey.of(alias))) {
                p.fail("otros_nombres", IssueCode.DUPLICATED_IN_FILE, alias);
            }
        }
        if (name == null) {
            return;
        }
        List<String> texts = new ArrayList<>(aliases);
        texts.addFirst(name);
        organizations.nameTakenBy(texts, null).ifPresent(owner -> p.fail("nombre", IssueCode.NAME_TAKEN, owner));
    }

    private String ruc(CsvRow row, Planned<?> p, String type, Set<String> rucsInFile) {
        String ruc = blankToNull(row.get("ruc"));
        if (ruc == null) {
            return null;
        }
        if (PUCP_UNIT.equals(type)) {
            p.fail("ruc", IssueCode.RUC_NOT_FOR_UNIT, null);
        } else if (!RucRule.isValid(ruc)) {
            p.fail("ruc", IssueCode.RUC_FORMAT, ruc);
        } else if (!rucsInFile.add(ruc)) {
            p.fail("ruc", IssueCode.DUPLICATED_IN_FILE, ruc);
        } else if (organizations.rucTaken(ruc, null)) {
            p.fail("ruc", IssueCode.RUC_TAKEN, ruc);
        }
        return ruc;
    }

    static List<String> splitList(String cell) {
        return Arrays.stream(cell.split(LIST_SEPARATOR)).map(String::strip).filter(s -> !s.isEmpty()).toList();
    }

    static String blankToNull(String cell) {
        return cell == null || cell.isBlank() ? null : cell.strip();
    }
}
