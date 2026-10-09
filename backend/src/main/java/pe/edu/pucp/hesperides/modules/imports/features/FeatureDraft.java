package pe.edu.pucp.hesperides.modules.imports.features;

import java.util.Map;

/**
 * Un tacho o bebedero leído del CSV o del formulario, ya validado en su
 * formato. {@code attributes} solo trae lo que la fila dice: al corregir, lo
 * que no menciona se conserva.
 */
public record FeatureDraft(int line, String code, double lat, double lon, String name,
                           Map<String, Object> attributes, String photo) {
}
