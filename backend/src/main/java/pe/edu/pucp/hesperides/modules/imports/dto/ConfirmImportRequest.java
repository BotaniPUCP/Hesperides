package pe.edu.pucp.hesperides.modules.imports.dto;

import java.util.Map;

/**
 * La decisión sobre cada posible duplicado: por número de línea, {@code true}
 * lo ingresa de todas formas y {@code false} lo omite. Todos deben decidirse.
 */
public record ConfirmImportRequest(Map<Integer, Boolean> duplicates) {

    public Map<Integer, Boolean> decisions() {
        return duplicates == null ? Map.of() : duplicates;
    }
}
