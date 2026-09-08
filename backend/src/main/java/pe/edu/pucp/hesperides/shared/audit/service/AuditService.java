package pe.edu.pucp.hesperides.shared.audit.service;

import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;

import java.util.Map;

/**
 * Puerta de entrada a audit_log (SPEC-004 §3.3). Se invoca desde los Services
 * de dominio, una llamada por acción sensible — nunca por reflexión ni AOP
 * genérico, para no auditar de más o de menos.
 */
public interface AuditService {

    /**
     * Registra una acción. La fila se persiste dentro de la transacción del
     * llamador (REQUIRED): si el cambio de negocio hace rollback, la fila de
     * auditoría que lo describe también revierte. Usa nulos para entityId
     * (acciones sin fila de dominio, p. ej. LOGIN_FAILED_LOCKOUT).
     */
    void record(AuditActionCode action, String entityType, Long entityId, Map<String, Object> changes);
}