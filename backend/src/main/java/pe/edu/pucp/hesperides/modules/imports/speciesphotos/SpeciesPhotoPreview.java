package pe.edu.pucp.hesperides.modules.imports.speciesphotos;

import pe.edu.pucp.hesperides.modules.imports.PlannedLine;
import pe.edu.pucp.hesperides.modules.imports.csv.CsvRow;
import pe.edu.pucp.hesperides.modules.imports.csv.CsvTable;
import pe.edu.pucp.hesperides.modules.imports.csv.Issue;
import pe.edu.pucp.hesperides.modules.imports.csv.PhotoReference;
import pe.edu.pucp.hesperides.modules.imports.csv.RowReader;
import pe.edu.pucp.hesperides.modules.imports.repository.SpeciesNames;
import pe.edu.pucp.hesperides.modules.imports.repository.SpecimenLookupRepository.SpeciesRef;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenPreview.SpeciesCount;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Las fotos genéricas de especie (SPEC-103 §6.5): {@code nombre_cientifico;foto}.
 * Cada fila reemplaza la foto genérica de su especie; una especie que no está
 * en el catálogo se omite y se cuenta, como en la carga de ejemplares.
 */
public record SpeciesPhotoPreview(List<Planned> rows, List<SpeciesCount> unknownSpecies, List<Issue> issues) {

    public static final List<String> COLUMNS = List.of("nombre_cientifico", "foto");

    /** No hay duplicados: la foto nueva reemplaza a la anterior. */
    public record Planned(int line, long speciesId, String slug, String photo) implements PlannedLine {
        @Override
        public boolean isPossibleDuplicate() {
            return false;
        }
    }

    public boolean canConfirm() {
        return issues.isEmpty() && !rows.isEmpty();
    }

    public static SpeciesPhotoPreview of(CsvTable table, Map<String, SpeciesRef> species, Set<String> zipFiles) {
        List<Issue> issues = new ArrayList<>();
        for (String column : COLUMNS) {
            if (!table.header().contains(column)) issues.add(new Issue(1, column, "Required column is missing"));
        }
        table.header().stream().filter(c -> !COLUMNS.contains(c))
                .forEach(c -> issues.add(new Issue(1, c, "Unknown column. Check the spelling against the standard")));
        if (!issues.isEmpty()) {
            return new SpeciesPhotoPreview(List.of(), List.of(), issues);
        }
        List<Planned> rows = new ArrayList<>();
        Map<String, Integer> unknown = new LinkedHashMap<>();
        for (CsvRow row : table.rows()) {
            RowReader r = new RowReader(row, issues);
            String name = r.required("nombre_cientifico");
            String photo = r.required("foto");
            if (!r.ok()) continue;
            SpeciesRef ref = species.get(SpeciesNames.key(name));
            if (ref == null) {
                unknown.merge(name.trim(), 1, Integer::sum);
                continue;
            }
            int before = issues.size();
            PhotoReference.check(row.line(), photo, zipFiles).ifPresent(issues::add);
            if (issues.size() == before) rows.add(new Planned(row.line(), ref.id(), ref.slug(), photo));
        }
        return new SpeciesPhotoPreview(rows,
                unknown.entrySet().stream().map(e -> new SpeciesCount(e.getKey(), e.getValue())).toList(), issues);
    }
}
