package pe.edu.pucp.hesperides.modules.admin.dto;

import jakarta.validation.constraints.NotNull;

import java.util.Map;

/**
 * Actualización parcial: solo se tocan los parámetros presentes en el mapa. La
 * validación de tipos, rangos y editabilidad vive en el servicio, porque depende
 * del {@code value_type} de cada fila, que Bean Validation no conoce.
 */
public record UpdateSystemParametersRequest(
        @NotNull Map<String, String> values) {
}