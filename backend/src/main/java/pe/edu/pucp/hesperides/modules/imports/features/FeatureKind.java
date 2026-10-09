package pe.edu.pucp.hesperides.modules.imports.features;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

/**
 * Los componentes del campus que se cargan por CSV (SPEC-103 §6.3 y §6.4). Las
 * columnas de atributos son las claves que ya usan los datos cargados (§4.3).
 */
public enum FeatureKind {

    WASTE_BIN("waste-bins", "TA", List.of("residuos", "accion", "recomendaciones", "nota")),
    DRINKING_FOUNTAIN("drinking-fountains", "BB", List.of("tipo", "estado", "sector", "nota"));

    private final String kind;
    private final String codePrefix;
    private final List<String> attributeColumns;

    FeatureKind(String kind, String codePrefix, List<String> attributeColumns) {
        this.kind = kind;
        this.codePrefix = codePrefix;
        this.attributeColumns = attributeColumns;
    }

    /** El tipo en la URL: {@code waste-bins}, {@code drinking-fountains}. */
    public String kind() {
        return kind;
    }

    /** El catálogo FEATURE_TYPE. */
    public String typeCode() {
        return name();
    }

    /** Prefijo del código de un componente nuevo: TA-000001, BB-000001. */
    public String codePrefix() {
        return codePrefix;
    }

    public List<String> attributeColumns() {
        return attributeColumns;
    }

    public List<String> columns() {
        List<String> all = new ArrayList<>(List.of("codigo", "latitud", "longitud", "lugar"));
        all.addAll(attributeColumns);
        all.add("foto");
        return List.copyOf(all);
    }

    public static Optional<FeatureKind> of(String kind) {
        return Arrays.stream(values()).filter(k -> k.kind.equals(kind)).findFirst();
    }
}
