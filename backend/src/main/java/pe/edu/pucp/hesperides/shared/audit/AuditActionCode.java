package pe.edu.pucp.hesperides.shared.audit;

/**
 * Acciones auditables. Es un enum Java y no un catálogo configurable porque cada
 * valor corresponde a una línea de código concreta que lo emite (SPEC-004 §3.1):
 * un valor que un administrador añadiera desde la UI no lo produciría nadie.
 *
 * Añadir un valor aquí obliga a actualizar la tabla de SPEC-004 §3.2.
 */
public enum AuditActionCode {
    USER_CREATED,
    USER_ROLE_CHANGED,
    USER_DEACTIVATED,
    USER_REACTIVATED,
    /** Añadida por SPEC-100 §9.3: explica meses después por qué alguien nunca pudo entrar. */
    USER_CREDENTIALS_DELIVERY_FAILED
}
