package pe.edu.pucp.hesperides.engine.pruning;

import java.math.BigDecimal;

/**
 * Quién poda un ejemplar y qué dato de tamaño se le puede mostrar (SPEC-105 §5.4 y §5.5).
 * Nunca recibe el promedio de la especie: un promedio no decide quién poda.
 */
public final class PruningAssignment {

    public static final String STABLE_STAFF = "STABLE_STAFF";
    public static final String THIRD_PARTY = "THIRD_PARTY";
    public static final String FIELD_VERIFICATION = "FIELD_VERIFICATION";

    public static final String STATUS_MEASURED = "MEASURED";
    public static final String STATUS_REFERENCE = "REFERENCE";
    public static final String STATUS_NOT_MEASURED = "NOT_MEASURED";

    private static final BigDecimal THIRD_PARTY_MIN_HEIGHT_M = new BigDecimal("5");

    private PruningAssignment() {
    }

    public static String propose(boolean critical, boolean measured, BigDecimal heightM) {
        if (!critical) {
            return STABLE_STAFF;
        }
        if (!measured || heightM == null) {
            return FIELD_VERIFICATION;
        }
        return heightM.compareTo(THIRD_PARTY_MIN_HEIGHT_M) >= 0 ? THIRD_PARTY : STABLE_STAFF;
    }

    public static String measurementStatus(boolean measured, boolean critical) {
        if (measured) {
            return STATUS_MEASURED;
        }
        return critical ? STATUS_NOT_MEASURED : STATUS_REFERENCE;
    }
}
