package pe.edu.pucp.hesperides.modules.imports.specimens;

import pe.edu.pucp.hesperides.modules.imports.csv.Cells;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenCsvSchema.RowReader;

import java.time.LocalDate;
import java.util.Objects;
import java.util.stream.Stream;

/** Convierte una fila del estándar de ejemplares en un borrador (SPEC-103 §6.2). */
final class SpecimenRowReader {

    private SpecimenRowReader() {
    }

    static SpecimenDraft read(RowReader r) {
        String species = r.required("nombre_cientifico");
        Double lat = coordinate(r, "latitud");
        Double lon = coordinate(r, "longitud");
        Integer quantity = r.read("cantidad", Cells::positiveInteger);
        SpecimenDraft.Measurement measurement = measurement(r);
        SpecimenDraft.Assessment assessment = assessment(r);
        if (!r.ok()) {
            return null;
        }
        return new SpecimenDraft(r.row().line(), r.text("codigo"), species, lat, lon, quantity == null ? 1 : quantity,
                r.text("referencia_catastro"), r.text("placa_antigua"), r.text("ubicacion_catastro"),
                measurement, assessment, r.text("foto"), r.text("observaciones"));
    }

    private static Double coordinate(RowReader r, String column) {
        if (r.required(column) == null) {
            return null;
        }
        return r.read(column, Cells::decimal);
    }

    /** Si hay alguna medida, la fecha es obligatoria: decide cuál es la vigente. */
    private static SpecimenDraft.Measurement measurement(RowReader r) {
        Double height = r.read("altura_m", Cells::decimal);
        Double trunk = r.read("altura_fuste_m", Cells::decimal);
        Double dbh = r.read("dap_cm", Cells::decimal);
        Double crown = r.read("radio_copa_m", Cells::decimal);
        Boolean banded = r.read("zunchado", Cells::yesNo);
        LocalDate date = r.read("fecha_medicion", Cells::date);
        boolean any = Stream.of(height, trunk, dbh, crown, banded).anyMatch(Objects::nonNull);
        if (!any) {
            return null;
        }
        if (date == null && r.text("fecha_medicion") == null) {
            r.fail("fecha_medicion", "A measurement needs its date");
        }
        return new SpecimenDraft.Measurement(date, height, trunk, dbh, crown, banded);
    }

    private static SpecimenDraft.Assessment assessment(RowReader r) {
        SpecimenDraft.Assessment a = new SpecimenDraft.Assessment(null,
                r.read("enfermedades", Cells::yesNo), r.read("plagas", Cells::yesNo),
                r.read("danos_mecanicos", Cells::yesNo), r.read("inclinacion", Cells::yesNo),
                r.read("ramas_secas", Cells::yesNo), r.read("cavidades", Cells::yesNo),
                r.read("raices_expuestas", Cells::yesNo), r.read("interferencia", Cells::yesNo),
                r.text("manejo_recomendado"), r.text("observacion_evaluacion"));
        LocalDate date = r.read("fecha_evaluacion", Cells::date);
        boolean any = SpecimenCsvSchema.ASSESSMENT.stream().anyMatch(c -> r.text(c) != null);
        if (!any) {
            return null;
        }
        if (date == null && r.text("fecha_evaluacion") == null) {
            r.fail("fecha_evaluacion", "An assessment needs its date");
        }
        return new SpecimenDraft.Assessment(date, a.hasDisease(), a.hasPests(), a.hasMechanicalDamage(), a.isLeaning(),
                a.hasDeadBranches(), a.hasCavitiesOrRot(), a.hasExposedRoots(), a.interferesWithInfrastructure(),
                a.recommendedManagement(), a.observation());
    }
}
