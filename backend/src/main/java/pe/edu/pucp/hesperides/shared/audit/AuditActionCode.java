package pe.edu.pucp.hesperides.shared.audit;

/**
 * Acciones que dejan constancia en audit_log. Cada valor corresponde a una
 * llamada a AuditService.record(...) en un punto específico del código
 * (SPEC-004 §3.2): no es un catálogo editable por el cliente.
 */
public enum AuditActionCode {
    USER_DEACTIVATED,
    USER_REACTIVATED,
    USER_ROLE_CHANGED,
    USER_CREATED,
    USER_CREDENTIALS_DELIVERY_FAILED,
    USER_CREDENTIALS_RESENT,
    USER_CREDENTIALS_MARKED_DELIVERED,
    USER_PASSWORD_CHANGED,
    CATALOG_ITEM_CREATED,
    CATALOG_ITEM_UPDATED,
    CATALOG_ITEM_DEACTIVATED,
    CATALOG_ITEM_ACTIVATED,
    GREEN_ELEMENT_SOFT_DELETED,
    GREEN_ELEMENT_EDITED,
    ZONE_EDITED,
    CONTRACT_CREATED,
    CONTRACT_EDITED,
    CONTRACT_TERMINATED,
    SYSTEM_PARAMETER_CHANGED,
    LOGIN_FAILED_LOCKOUT,
    REFRESH_TOKEN_REUSE_DETECTED
}