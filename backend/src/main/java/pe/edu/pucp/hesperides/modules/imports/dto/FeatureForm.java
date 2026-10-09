package pe.edu.pucp.hesperides.modules.imports.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Un tacho o bebedero del formulario (SPEC-103 §5.1). Se convierte en las
 * celdas de una fila del estándar para pasar por las mismas reglas que el CSV.
 *
 * @param kind {@code waste-bins} o {@code drinking-fountains}
 */
public record FeatureForm(@NotBlank String kind,
                          @NotNull @DecimalMin("-90") @DecimalMax("90") Double lat,
                          @NotNull @DecimalMin("-180") @DecimalMax("180") Double lon,
                          @Size(max = 200) String place,
                          List<String> wasteStreams, @Size(max = 200) String action,
                          @Size(max = 500) String recommendations,
                          String fountainKind, String fountainStatus, @Size(max = 40) String sector,
                          @Size(max = 2000) String note) {

    public Map<String, String> cells() {
        Map<String, String> cells = new LinkedHashMap<>();
        cells.put("latitud", lat.toString());
        cells.put("longitud", lon.toString());
        cells.put("lugar", text(place));
        cells.put("nota", text(note));
        if ("waste-bins".equals(kind)) {
            cells.put("residuos", wasteStreams == null ? "" : String.join("|", wasteStreams));
            cells.put("accion", text(action));
            cells.put("recomendaciones", text(recommendations));
        } else {
            cells.put("tipo", text(fountainKind));
            cells.put("estado", text(fountainStatus));
            cells.put("sector", text(sector));
        }
        return cells;
    }

    private static String text(String s) {
        return s == null ? "" : s.trim();
    }
}
