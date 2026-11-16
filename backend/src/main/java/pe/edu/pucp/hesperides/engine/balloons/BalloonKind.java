package pe.edu.pucp.hesperides.engine.balloons;

/**
 * Qué representa un globo (SPEC-113 §5.1). Es un enum de código y no un catálogo
 * (D-04): cada tipo exige su dibujo y su fuente en código, así que un tipo nuevo
 * creado desde un catálogo no tendría ni una ni otra.
 */
public enum BalloonKind {
    INCIDENT(true),
    INTERVENTION(false),
    IRRIGATION(false),
    IRRIGATION_DUE(true),
    RESERVATION(false),
    /** Sin fuente aún: la aportará el calendario de eventos PUCP. */
    BLOCKING_EVENT(false),
    /** Sin fuente aún: la aportará REQ 5.11. */
    MACHINERY_CUT(false);

    /** Variantes de {@link #INCIDENT}: la urgencia, o {@code NONE} si se aprobó sin ella. */
    public static final String HIGH = "HIGH";
    public static final String MEDIUM = "MEDIUM";
    public static final String LOW = "LOW";
    public static final String NONE = "NONE";
    /** Variantes de {@link #IRRIGATION_DUE}. */
    public static final String OVERDUE = "OVERDUE";
    public static final String DUE = "DUE";

    private final boolean attention;

    BalloonKind(boolean attention) {
        this.attention = attention;
    }

    /** Pide una acción (se va cuando alguien actúa) o solo informa (se va sola). */
    public boolean attention() {
        return attention;
    }

    /** Menor es más urgente (SPEC-113 §5.5): gana el sitio en pantalla y el tope de la respuesta. */
    public int rank(String variant) {
        return switch (this) {
            case INCIDENT -> switch (variant == null ? NONE : variant) {
                case HIGH -> 0;
                case MEDIUM -> 1;
                case LOW -> 3;
                default -> 4;
            };
            case IRRIGATION_DUE -> OVERDUE.equals(variant) ? 2 : 5;
            case IRRIGATION -> 6;
            case INTERVENTION -> 7;
            case RESERVATION -> 8;
            case BLOCKING_EVENT, MACHINERY_CUT -> 9;
        };
    }
}
