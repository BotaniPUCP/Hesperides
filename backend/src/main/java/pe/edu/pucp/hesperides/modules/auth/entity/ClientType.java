package pe.edu.pucp.hesperides.modules.auth.entity;

/**
 * Metadato del sistema, no un dato de negocio: por eso es un enum Java y no
 * un catálogo configurable. Un administrador no puede inventar un tercer tipo
 * de cliente desde la UI porque ningún código sabría atenderlo (SPEC-004 §3.1
 * aplica el mismo criterio a AuditActionCode).
 */
public enum ClientType {
    WEB("web"),
    MOBILE("mobile");

    private final String value;

    ClientType(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static ClientType fromHeader(String header) {
        return MOBILE.value.equalsIgnoreCase(header) ? MOBILE : WEB;
    }
}