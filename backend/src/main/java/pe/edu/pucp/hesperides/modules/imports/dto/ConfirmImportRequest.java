package pe.edu.pucp.hesperides.modules.imports.dto;

import java.util.Map;

/**
 * La decisión sobre cada posible duplicado: por número de línea, {@code true}
 * lo ingresa de todas formas y {@code false} lo omite. Todos deben decidirse.
 */
public record ConfirmImportRequest(Map<Integer, Boolean> duplicates, String summaryFingerprint, String planFingerprint) {

    public ConfirmImportRequest(Map<Integer, Boolean> duplicates) {
        this(duplicates, null, null);
    }

    public ConfirmImportRequest(Map<Integer, Boolean> duplicates, String summaryFingerprint) {
        this(duplicates, summaryFingerprint, null);
    }

    public Map<Integer, Boolean> decisions() {
        return duplicates == null ? Map.of() : duplicates;
    }
}
