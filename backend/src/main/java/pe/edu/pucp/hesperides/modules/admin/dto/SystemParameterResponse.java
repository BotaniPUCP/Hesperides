package pe.edu.pucp.hesperides.modules.admin.dto;

import pe.edu.pucp.hesperides.modules.admin.entity.SystemParameter;

/**
 * Un parámetro tal como lo ve la API. Se identifica por su {@code code}, que es
 * lo que la lógica del backend compara (SPEC-002 §4.9): el id numérico no tiene
 * uso público.
 */
public record SystemParameterResponse(
        String code,
        String label,
        String value,
        String valueType,
        String description,
        boolean isEditable) {

    public static SystemParameterResponse from(SystemParameter parameter) {
        return new SystemParameterResponse(
                parameter.getCode(),
                parameter.getLabel(),
                parameter.getValue(),
                parameter.getValueType(),
                parameter.getDescription(),
                parameter.isEditable());
    }
}