package pe.edu.pucp.hesperides.engine.incidents;

/**
 * Código propio de una incidencia, `INC-AAAA-NNNN` (SPEC-201 §3.7). No se parece al formato OSG
 * a propósito: los códigos OSG los emite la universidad y van en `external_code`.
 */
public final class IncidentCode {

    private static final int MIN_DIGITS = 4;

    private IncidentCode() {
    }

    public static String format(int year, long number) {
        if (number <= 0) throw new IllegalArgumentException("Incident number must be positive");
        return "INC-" + year + "-" + String.format("%0" + MIN_DIGITS + "d", number);
    }
}
