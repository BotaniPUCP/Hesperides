package pe.edu.pucp.hesperides.modules.imports.speciesphotos;

import pe.edu.pucp.hesperides.modules.imports.PlannedLine;
import pe.edu.pucp.hesperides.modules.imports.csv.Cells;
import pe.edu.pucp.hesperides.modules.imports.csv.CsvRow;
import pe.edu.pucp.hesperides.modules.imports.csv.CsvTable;
import pe.edu.pucp.hesperides.modules.imports.csv.Issue;
import pe.edu.pucp.hesperides.modules.imports.csv.PhotoReference;
import pe.edu.pucp.hesperides.modules.imports.csv.RowReader;
import pe.edu.pucp.hesperides.modules.imports.repository.SpeciesNames;
import pe.edu.pucp.hesperides.modules.imports.repository.SpecimenLookupRepository.SpeciesRef;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenPreview.SpeciesCount;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Las fotos genéricas de especie (SPEC-103 §6.5, SPEC-104 D-01 a D-04): las filas
 * de una especie forman su conjunto completo, en el orden de {@code orden} o, sin
 * él, en el de las filas. Una especie que no está en el catálogo se omite y se cuenta.
 */
public record SpeciesPhotoPreview(List<Planned> rows, List<SpeciesCount> unknownSpecies, List<Issue> issues) {

    public static final List<String> REQUIRED = List.of("nombre_cientifico", "foto");
    public static final List<String> COLUMNS = List.of("nombre_cientifico", "foto", "orden", "autor", "licencia", "fuente");

    /** No hay duplicados: el conjunto nuevo reemplaza al anterior. */
    public record Planned(int line, long speciesId, String slug, String photo, Integer order,
                          String author, String license, String sourcePage) implements PlannedLine {
        @Override
        public boolean isPossibleDuplicate() {
            return false;
        }
    }

    public boolean canConfirm() {
        return issues.isEmpty() && !rows.isEmpty();
    }

    /** Por especie, sus fotos en el orden en que se mostrarán. */
    public Map<Long, List<Planned>> sets() {
        Comparator<Planned> byOrder = Comparator.comparing(Planned::order, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparingInt(Planned::line);
        return rows.stream().sorted(byOrder)
                .collect(Collectors.groupingBy(Planned::speciesId, LinkedHashMap::new, Collectors.toList()));
    }

    public static SpeciesPhotoPreview of(CsvTable table, Map<String, SpeciesRef> species, Set<String> files) {
        List<Issue> issues = headerIssues(table.header());
        if (!issues.isEmpty()) {
            return new SpeciesPhotoPreview(List.of(), List.of(), issues);
        }
        List<Planned> rows = new ArrayList<>();
        Map<String, Integer> unknown = new LinkedHashMap<>();
        Set<String> usedOrders = new HashSet<>();
        for (CsvRow row : table.rows()) {
            RowReader r = new RowReader(row, issues);
            String name = r.required("nombre_cientifico");
            String photo = r.required("foto");
            Integer order = r.read("orden", Cells::positiveInteger);
            String source = r.text("fuente");
            if (source != null && !PhotoReference.isLink(source)) {
                r.fail("fuente", "The source must be a web link (https://…)");
            }
            if (!r.ok()) continue;
            SpeciesRef ref = species.get(SpeciesNames.key(name));
            if (ref == null) {
                unknown.merge(name.trim(), 1, Integer::sum);
                continue;
            }
            if (order != null && !usedOrders.add(ref.id() + "#" + order)) {
                r.fail("orden", "Another photo of this species already has order " + order);
                continue;
            }
            int before = issues.size();
            PhotoReference.check(row.line(), photo, files).ifPresent(issues::add);
            if (issues.size() == before) {
                rows.add(new Planned(row.line(), ref.id(), ref.slug(), photo, order, r.text("autor"), r.text("licencia"), source));
            }
        }
        return new SpeciesPhotoPreview(rows,
                unknown.entrySet().stream().map(e -> new SpeciesCount(e.getKey(), e.getValue())).toList(), issues);
    }

    private static List<Issue> headerIssues(List<String> header) {
        List<Issue> issues = new ArrayList<>();
        REQUIRED.stream().filter(c -> !header.contains(c)).forEach(c -> issues.add(new Issue(1, c, "Required column is missing")));
        header.stream().filter(c -> !COLUMNS.contains(c))
                .forEach(c -> issues.add(new Issue(1, c, "Unknown column. Check the spelling against the standard")));
        return issues;
    }
}
