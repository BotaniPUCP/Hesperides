package pe.edu.pucp.hesperides.shared.audit;

import java.util.Map;

/**
 * Registra una acción sensible. La implementación que persiste en audit_log es
 * de SPEC-004, que aún no está implementado; hasta entonces LoggingAuditService
 * cumple el contrato escribiendo a SLF4J.
 *
 * Las llamadas se colocan ya en su sitio para que SPEC-004 solo tenga que
 * aportar otro bean, sin tocar los servicios de dominio.
 */
public interface AuditService {

    void record(AuditActionCode action, String entityType, Long entityId, Map<String, Object> changes);
}
