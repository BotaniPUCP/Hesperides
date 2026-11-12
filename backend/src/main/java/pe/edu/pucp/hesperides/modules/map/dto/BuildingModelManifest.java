package pe.edu.pucp.hesperides.modules.map.dto;

import com.fasterxml.jackson.annotation.JsonRawValue;

/**
 * Manifiesto del modelo de edificios: versión, anclaje, nodos y polígonos de
 * los desniveles y de la huaca (SPEC-108 §3).
 *
 * @param manifest el JSON generado, tal como está en el jar ({@code @JsonRawValue}):
 *                 el backend no lo interpreta, solo lo entrega dentro del sobre.
 */
public record BuildingModelManifest(@JsonRawValue String manifest) {
}
